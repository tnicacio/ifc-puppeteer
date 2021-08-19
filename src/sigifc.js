const puppeteer = require('puppeteer');
const path = require('path');
const dir = require('./utils/Downloader');

const BASE_URL = 'https://sig.ifc.edu.br/sigaa/';
const DOWNLOAD_PATH = './downloads';
const enumActions = {
  FILES: 'files',
  GRADES: 'grades',
};

const sigifc = {
  browser: null,
  page: null,
  classes: [],
  currentClass: '',

  initialize: async () => {
    try {
      sigifc.browser = await puppeteer.launch({
        defaultViewport: null,
        headless: false,
      });

      sigifc.page = await sigifc.browser.newPage();
    } catch (e) {
      console.log('on initialize: ', e);
    }
  },

  close: async () => {
    try {
      await sigifc.page.waitForTimeout(5000);
      await sigifc.browser?.close();
    } catch (e) {
      console.log('on close', e);
    }
  },

  login: async (username, password) => {
    const typingDelay = { delay: 50 };

    try {
      sigifc.page.on('dialog', async (dialog) => {
        console.log(dialog.message());
        await dialog.dismiss();
      });

      await sigifc.page.goto(`${BASE_URL}'verTelaLogin.do`, {
        waitUntil: 'networkidle2',
      });

      await sigifc.page.type('input[name="user.login"]', username, typingDelay);
      await sigifc.page.type('input[name="user.senha"]', password, typingDelay);
      await sigifc.page.click('input[value="Entrar"]');
    } catch (e) {
      console.log('on login: ', e);
    }
  },

  goToAllClassesPage: async () => {
    try {
      await sigifc.page.goto(`${BASE_URL}portais/discente/turmas.jsf`, {
        waitUntil: 'domcontentloaded',
      });
    } catch (e) {
      console.log('on goToAllClassesPage: ', e);
    }
  },

  getClasses: async () => {
    try {
      const allClasses = await sigifc.page.evaluate(() => {
        const arrayOfClasses = [];

        const evenLines = Array.from(
          document.querySelectorAll('tbody > tr[class="linhaPar"]')
        );
        const oddLines = Array.from(
          document.querySelectorAll('tbody > tr[class="linhaImpar"]')
        );
        const allLines = [...evenLines, ...oddLines];

        for (const line of allLines) {
          const columns = line?.children;

          const lenghtColumnOnClick = columns[4]?.children?.length;

          const classObj = {
            name: columns[0]?.innerHTML,
            classNumber: columns[1]?.innerHTML,
            workload: columns[2]?.innerHTML,
            schedule: columns[3]?.innerHTML,
            onClickText:
              lenghtColumnOnClick === 2
                ? columns[4]?.children?.item(1)?.getAttribute('onclick')
                : columns[4]?.children?.item(0)?.getAttribute('onclick'),
          };

          arrayOfClasses.push(classObj);
        }

        return arrayOfClasses;
      });

      sigifc.classes = allClasses;
      return allClasses;
    } catch (e) {
      console.log('on getClasses', e);
    }
  },

  goToClass: async (className = '', classList = []) => {
    try {
      const classes = classList.length ? classList : sigifc.classes;
      const upperCaseClassName = className.toUpperCase();

      const classFound = classes.find((classe) =>
        classe.name.includes(upperCaseClassName)
      );

      if (classFound) {
        sigifc.currentClass = classFound.name;
        const classOnClickText = classFound.onClickText;
        await sigifc.page.waitForTimeout(2000);
        await clickOnAnchorWithOnClickText(sigifc.page, classOnClickText);
      }
    } catch (e) {
      console.log(`Error when going to class ${sigifc.currentClass}`, e);
    }
  },

  goToClassFilesPage: async (classe) => {
    try {
      await sigifc.page.waitForTimeout(5000);

      await sigifc.page.evaluate(() =>
        document.querySelector('div[class*=itemMenuHeaderMateriais]')?.click()
      );

      await sigifc.page.evaluate(() =>
        Array.from(document.querySelectorAll('a'))
          .find((a) => a.children?.item(0)?.innerHTML?.includes('Arquivos'))
          ?.click()
      );
    } catch (e) {
      console.log(`Error when going to files page of ${classe}`, e);
    }
  },

  downloadAllFiles: async (classe) => {
    try {
      await sigifc.page.waitForTimeout(5000);
      const downloadAllFilesSelector = await sigifc.page.evaluate(() => {
        const anchorElement = Array.from(document.querySelectorAll('a')).find(
          (a) => a.innerHTML?.includes('Baixar todos os arquivos')
        );
        const anchorText = anchorElement?.getAttribute('onclick');
        return anchorText;
      });

      if (!downloadAllFilesSelector) {
        console.log(`No files found for ${sigifc.currentClass}`);
        return;
      }

      const downloadPath = setUpDirectory(
        sigifc.currentClass,
        enumActions.FILES
      );
      await sigifc.page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath,
      });
      await sigifc.page.waitForTimeout(2000);
      await clickOnAnchorWithOnClickText(sigifc.page, downloadAllFilesSelector);
      await sigifc.page.waitForTimeout(3000);
      console.log(`Files of ${classe} downloaded with success`);
    } catch (e) {
      console.log(`Error while downloading files of ${classe}`, e);
    }
  },

  goToClassGradesPage: async (classe) => {
    try {
      await sigifc.page.waitForTimeout(5000);

      await sigifc.page.evaluate(() =>
        document.querySelector('div[class*=itemMenuHeaderAlunos]')?.click()
      );

      await sigifc.page.evaluate(() =>
        Array.from(document.querySelectorAll('a'))
          .find((a) => a.children?.item(0)?.innerHTML?.includes('Ver Notas'))
          ?.click()
      );
    } catch (e) {
      console.log(`Error when going to grades page of ${classe}`, e);
    }
  },

  takeAScreenshotOfClassGrades: async (classe) => {
    try {
      await sigifc.page.waitForTimeout(3000);
      const screenshotPath = setUpDirectory(
        sigifc.currentClass,
        enumActions.GRADES
      );

      //To-study: regex
      const fileName = new Date()
        .toLocaleString()
        .replace(/\//g, '')
        .replace(/:/g, '')
        .replace(/ /g, '');
      console.log(`Taking screenshot of ${classe} grades`);
      await sigifc.page.screenshot({
        path: `${screenshotPath}/${fileName}.png`,
      });
      await sigifc.page.waitForTimeout(2000);
    } catch (e) {
      console.log(`Error while getting grades of ${classe}`, e);
    }
  },
};

const clickOnAnchorWithOnClickText = async (page, onClickText) => {
  try {
    const selector = `a[onclick="${onClickText}"]`;
    await page.click(selector);
  } catch (e) {
    console.log('on clickOnAnchorWithOnClickText', e);
  }
};

const setUpDirectory = (className, actionName) => {
  const downloadPath = path.resolve(
    `${DOWNLOAD_PATH}/${className}/${actionName}`
  );
  dir.createDirectoryIfNotExists(downloadPath);
  return downloadPath;
};

module.exports = sigifc;
