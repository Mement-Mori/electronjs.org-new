//@ts-check
require('dotenv-safe').config();

const stream = require('stream');
const { join } = require('path');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);
const got = require('got').default;
const unzipper = require('unzipper');

// Assumes running from the root of the repo
const OUTPUT_PATH = join(process.cwd(), 'temp-i18n');
const { CROWDIN_TOKEN, CROWDIN_PROJECT_ID } = process.env;
const PROJECT_ID = parseInt(CROWDIN_PROJECT_ID);
const crowdin = require('@crowdin/crowdin-api-client').default;

// initialization of crowdin client
const { translationsApi } = new crowdin({
  token: CROWDIN_TOKEN,
});

/**
 * Downloads the Crowdin file and unzips the contents
 * @param {string} url
 * @param {string} destination
 * @returns {Promise<void>}
 */
const downloadFiles = async (url, destination) => {
  await pipeline(got.stream(url), unzipper.Extract({ path: destination }));
};

/**
 * Gets the download link for the latest build translation of `PROJECT_ID`
 */
const getDownloadLink = async () => {
  const builds = await translationsApi.listProjectBuilds(PROJECT_ID);

  const {
    data: { url },
  } = await translationsApi.downloadTranslations(
    PROJECT_ID,
    builds.data[0].data.id
  );

  return url;
};

/**
 * Downloads the translations into the given target
 * or the default one otherwise.
 * @param {string} [target]
 */
const downloadTranslations = async (target) => {
  const downloadLink = await getDownloadLink();
  const destination = target || OUTPUT_PATH;
  await downloadFiles(downloadLink, destination);
};

// When a file is run directly from Node.js, `require.main` is set to its module.
// That means that it is possible to determine whether a file has been run directly
// by testing `require.main === module`.
// https://nodejs.org/docs/latest/api/modules.html#modules_accessing_the_main_module
if (require.main === module) {
  downloadTranslations();
}

module.exports = {
  downloadTranslations,
};
