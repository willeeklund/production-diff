export interface ConfigPart {
  /**
   * The name of the Git repository for this deployable part.
   * This is used to go into correct subfolder when running Git commands for this part.
   */
  folder: string;

  /**
   * If you have a version.json deployed, specify the URL here.
   */
  versionUrl?: string;

  /**
   * The Git branch you merge pull requests to.
   * When you only have one long-living branch (such as the "Github Flow"), this is usually "origin/main".
   */
  stableCodeReference: string;

  /**
   * If you have a separate branch for the latest code, specify it here.
   * If you for instance use "Git Flow", this could be "origin/develop".
   */
  latestCodeReference?: string;

  /**
   * In this section of the report, only show changes in this subfolder.
   * Very useful if you have a monorepo setup.
   */
  onlySubfolder?: string;

  /**
   * If this part is not deployed on a public web URL (such as a native app client).
   * Then create a Git tag with the latest version number in a format you prefer.
   * The script will pick up the latest semver version, for instance "ios.v2.2.1"
   */
  tagFormat?: string;
}

export type ConfigParts = {
  [key: string]: ConfigPart;
};

const configParts: ConfigParts = {
    'repoName1': {
        // Folder path is relative to the folder above "production-diff" folder.
        // -- codeFolder
        // ----- production-diff
        // ----- repoName1
        folder: 'repoName1',
        stableCodeReference: 'origin/main',
        versionUrl: 'https://www.yourDomain.com/version.json',
    },
/*
    // -- Below are examples with multiple deployable parts in one Git repo --
    'repoName2DeployableA': {
        folder: 'repoName2', // This Git repo contains multiple individually deployable parts
        stableCodeReference: 'origin/main',
        versionUrl: 'https://otherDeployableA.yourDomain.com/version.json',
        onlySubfolder: 'deployable-A', // In this section of the report, only show changes in this subfolder
    },
    'repoName2DeployableB': {
        folder: 'repoName2', // This Git repo contains multiple individually deployable parts
        stableCodeReference: 'origin/main',
        versionUrl: 'https://otherDeployableB.yourDomain.com/api/version',
        onlySubfolder: 'deployable-B', // In this section of the report, only show changes in this subfolder
    },
    'iosApp': {
        folder: 'repoName2',
        stableCodeReference: 'origin/main',
        onlySubfolder: 'ios',
        // If this part is not deployed (such as a native app client)
        // Then create a Git tag with the latest version number in a format you prefer.
        // The script will pick up the latest semver version, for instance "ios.v2.2.1"
        tagFormat: 'ios.v*',
    },
*/
}

export const getConfigForAllParts = () => {
    return Object.values(configParts);
}

export const getConfigForPart = (part: string) => {
    if (!configParts[part]) {
        throw new Error(`We do not have a deployable part called "${part}".`);
    }
    return configParts[part]
};

/**
 * This is a regular expression to find all tickets in a commit message.
 * In this example, we look for "bnk-123" and "bnk 123".
 */
export const ticketsRegexp = new RegExp(/bnk[ -]\d+/gim);