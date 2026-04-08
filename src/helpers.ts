// eslint-disable-next-line no-undef
import colors from 'colors';
import util from 'util';
import { ConfigPart, ticketsRegexp } from './config-per-part';

export const exec = async (strings: TemplateStringsArray, ...values: string[]) => {
  const zx = await import('zx');
  const exec = zx.$;
  exec.verbose = false;
  if (process.env.DEBUG) {
    exec.verbose = true;
  }
  return exec(strings, ...values);
};

const hashLength = 8;

// ----- Functions -----

const getProductionCommit = async ({folder, versionUrl, tagFormat}: {folder: string, versionUrl?: string, tagFormat?: string}) => {
  if (versionUrl) {
    try {
      const res = await fetch(versionUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${versionUrl}: ${res.status} ${res.statusText}`);
      }
      const versionJson: {commit: string} = await res.json();
      if (!versionJson.commit) {
        throw new Error(`No commit field in response from ${versionUrl}`);
      }
      const shortHash = await shortCommit(folder, versionJson.commit);
      return shortHash;
    } catch (e) {
      throw new Error(`Failed to get production commit from ${versionUrl}: ${e}`);
    }
  }

  try {
    const { stdout: latestGitTag } =
      await exec`cd ../${folder} && git tag --sort=version:refname | grep ${tagFormat ?? 'v*'} | tail -n 1`;
    const trimmed = latestGitTag.trim();
    return trimmed
  } catch (e) {
    throw new Error(`Failed to get production commit for folder ${folder}: ${e}`);
  }
};

const getCommitForReference = async ({folder, reference}: {folder: string, reference: string})  => {
  try {
    const { stdout: commit } =
      await exec`cd ../${folder} && git show -s --format="%h" ${reference}`;
    const trimmed = commit.trim();
    return trimmed
  } catch (e) {
    throw new Error(`Failed to get commit for reference ${reference} in folder ${folder}: ${e}`);
  }
};

const gitFetchFolder = async (folder: string) => {
  try {
    await exec`cd ../${folder} && git fetch --quiet`;
  } catch (e) {
    throw new Error(`Failed to fetch repo for folder ${folder}: ${e}`);
  }
};

const getMergeBaseCommit = async (folder: string, productionCommit: string, startReference: string) => {
  try {
    const { stdout: mergeBaseProd } =
      await exec`cd ../${folder} && git merge-base ${productionCommit} ${startReference}`;
    return mergeBaseProd.slice(0, hashLength);
  } catch (e) {
    throw new Error(`Failed to get merge base for folder ${folder}: ${e}`);
  }
};

const describeCommit = async (folder: string, commit: string) => {
  try {
    const {
      stdout: describe,
      stderr,
    } = await exec`cd ../${folder} && git describe --tags --exact-match ${commit}`;

    if (stderr) {
      return commit;
    }

    return describe.trim();
  } catch (e) {
    return commit;
  }
}

const shortCommit = async (folder: string, commit: string) => {
  try {
    const { stdout: shortCommit } = await exec`cd ../${folder} && git rev-parse --short ${commit}`;
    return shortCommit.trim();
  } catch (e) {
    throw new Error(`Failed to get short commit for ${commit} in folder ${folder}: ${e}`);
  }
}

const getGitLogSinceCommit = async (
  {folder, commit, startReference, onlySubfolder}: {folder: string, commit: string, startReference: string, onlySubfolder?: string}
): Promise<{gitLogSinceCommit: string, tickets: Set<string>}> => {
  try {
    let gitLogSinceCommit: string;
    let fullGitLog: string;

    if (onlySubfolder) {
      const result1 = await exec`cd ../${folder} && git log ${commit}..${startReference} --pretty=format:"%ad %s @ %an" --date=format:"%Y-%m-%d" --reverse -- ${onlySubfolder}`;
      gitLogSinceCommit = result1.stdout;
      const result2 = await exec`cd ../${folder} && git log ${commit}..${startReference} --all --reverse -- ${onlySubfolder}`;
      fullGitLog = result2.stdout;
    } else {
      const result1 = await exec`cd ../${folder} && git log ${commit}..${startReference} --pretty=format:"%ad %s @ %an" --date=format:"%Y-%m-%d" --reverse`;
      gitLogSinceCommit = result1.stdout;
      const result2 = await exec`cd ../${folder} && git log ${commit}..${startReference} --all --reverse`;
      fullGitLog = result2.stdout;
    }

    return {gitLogSinceCommit, tickets: ticketsFromString(fullGitLog)};
  } catch (e) {
    throw new Error(`Failed to get git log for folder ${folder}: ${e}`);
  }
};

export interface DiffResult {
  folder: string,
  logStable: string,
  logLatest: string,
  prodCommit: string,
  prodCommitDescription: string,
  stableCodeReference: string,
  stableBranchCommit: string,
  latestCodeReference?: string,
  onlySubfolder?: string,
  tickets: Set<string>,
}

// ----- Check diff algorithm -----
export const checkDiffForFolder = async ({
  folder,
  stableCodeReference,
  latestCodeReference,
  versionUrl,
  onlySubfolder,
  tagFormat,
}: ConfigPart): Promise<DiffResult> => {
  console.log(colors.green.bold(`----- Diff for ${onlySubfolder || folder} -----`));
  await gitFetchFolder(folder);
  const prodCommit = await getProductionCommit({folder, versionUrl, tagFormat});
  // Prod -> stable branch
  const stableBranchCommit = await getCommitForReference({folder, reference: stableCodeReference})
  const prodCommitDescription = await describeCommit(folder, prodCommit);
  const mergeBaseStable = await getMergeBaseCommit(
    folder,
    prodCommit,
    stableCodeReference
  );
  const {gitLogSinceCommit: logStable, tickets: ticketsStable} = await getGitLogSinceCommit({
    folder,
    commit: mergeBaseStable,
    startReference: stableCodeReference,
    onlySubfolder
  });
  console.log(colors.yellow.bold(`${prodCommitDescription}${
    prodCommit !== prodCommitDescription ? ' ' + prodCommit : ''
  } --> ${stableCodeReference} ${stableBranchCommit}`));
  console.log(logStable);
  console.log('');

  let logLatest = ''
  if (latestCodeReference) {
    // Stable branch -> latest code branch
    const mergeBaseLatest = await getMergeBaseCommit(
      folder,
      stableCodeReference,
      latestCodeReference
    );
    const { gitLogSinceCommit: logLatestCommit} = await getGitLogSinceCommit({
      folder,
      commit: mergeBaseLatest,
      startReference: latestCodeReference,
      onlySubfolder,
    });
    logLatest = logLatestCommit;

    if (logLatest) {
      console.log(colors.yellow.bold(`${stableCodeReference} --> ${latestCodeReference}`));
      console.log(colors.blue(logLatest));
      console.log('');
    }
  }

  return {
    folder,
    logStable,
    logLatest,
    prodCommit,
    prodCommitDescription,
    stableCodeReference,
    stableBranchCommit,
    latestCodeReference,
    onlySubfolder,
    tickets: ticketsStable,
  };
};

const ticketsFromString = (content: string) => {
  const it = content.matchAll(ticketsRegexp);
  let result = it.next();
  const tickets: Set<string> = new Set();

  while (!result.done) {
    const ticket = result.value[0];
    tickets.add(ticket.toUpperCase().replace(' ', '-'));
    result = it.next();
  }

  return tickets;
};

export const sendToSlack = async (webhookUrl: string, messageBody: any) => {
  return fetch(webhookUrl, {
    method: 'POST',
    body: JSON.stringify(messageBody),
    headers: { 'content-type': 'application/json' },
  }).then((res) => {
    if (!res.ok) {
      console.error('Response from Slack:');
      console.log(util.inspect(res, {showHidden: false, depth: null, colors: true}));
      throw new Error(res.statusText);
    }
    return true;
  });
};
