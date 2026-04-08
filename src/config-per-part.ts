import { configParts } from '../repo-config';

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
