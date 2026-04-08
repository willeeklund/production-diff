import { ConfigParts } from './src/config-per-part';

/**
 * Customize your deployable parts here.
 * This file is gitignored, so you can modify it locally without affecting the repo.
 */
export const configParts: ConfigParts = {
    'ava': {
        // Folder path is relative to the folder above "production-diff" folder.
        // -- codeFolder
        // ----- production-diff
        // ----- repoName1
        folder: 'AVA--FMSIC',
        stableCodeReference: 'origin/master',
        versionUrl: 'https://ava.samhall.se/gitVersion.json',
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
