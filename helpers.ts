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
    const versionJson: {commit: string} = await fetch(versionUrl).then((res) => res.json());
    return shortCommit(folder, versionJson.commit);
  }

  const { stdout: latestGitTag } =
    await exec`cd ../${folder} && git tag --sort=version:refname | grep ${tagFormat ?? 'v*'} | tail -n 1`;
  return latestGitTag.trim()
};

const getCommitForReference = async ({folder, reference}: {folder: string, reference: string})  => {
  const { stdout: commit } =
    await exec`cd ../${folder} && git show -s --format="%h" ${reference}`;
  return commit.trim()
};

const gitFetchFolder = async (folder: string) => {
  await exec`cd ../${folder} && git fetch --quiet`;
};

const getMergeBaseCommit = async (folder: string, productionCommit: string, startReference: string) => {
  const { stdout: mergeBaseProd } =
    await exec`cd ../${folder} && git merge-base ${productionCommit} ${startReference}`;
  return mergeBaseProd.slice(0, hashLength);
};

const describeCommit = async (folder: string, commit: string) => {
  const {
    stdout: describe,
    stderr,
  } = await exec`cd ../${folder} && git describe --tags --exact-match ${commit}`;

  if (stderr) {
    return commit;
  }

  return describe.trim();
}

const shortCommit = async (folder: string, commit: string) => {
  const { stdout: shortCommit } = await exec`cd ../${folder} && git rev-parse --short ${commit}`;
  return shortCommit.trim();
}

const getGitLogSinceCommit = async (
  {folder, commit, startReference, onlySubfolder}: {folder: string, commit: string, startReference: string, onlySubfolder?: string}
): Promise<{gitLogSinceCommit: string, tickets: Set<string>}> => {
  onlySubfolder = onlySubfolder ? `${onlySubfolder}` : '';
  const { stdout: gitLogSinceCommit } =
    await exec`cd ../${folder} && git log ${commit}..${
      startReference
    } --pretty=format:"%ad %s @ %an" --date=format:"%Y-%m-%d" --reverse ${onlySubfolder}`;
  const { stdout: fullGitLog } =
    await exec`cd ../${folder} && git log ${commit}..${
      startReference
    } --all --reverse ${onlySubfolder}`;

  return {gitLogSinceCommit, tickets: ticketsFromString(fullGitLog)};
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
