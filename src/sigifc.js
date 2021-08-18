const puppeteer = require('puppeteer');

const BASE_URL = 'https://sig.ifc.edu.br/sigaa/';

const sigifc = {
  browser: null,
  page: null,
  classes: [],
  classeAtual: '',

  initialize: async () => {
    try {
      sigifc.browser = await puppeteer.launch({
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
      // await sigifc.page.waitForTimeout(3000);
      await sigifc.page.goto(`${BASE_URL}portais/discente/turmas.jsf`, {
        waitUntil: 'domcontentloaded',
      });
    } catch (e) {
      console.log('on goToAllClassesPage: ', e);
    }
  },

  getClasses: async () => {
    try {
      const turmas = await sigifc.page.evaluate(() => {
        const arrayTurmas = [];

        const linhasPares = Array.from(
          document.querySelectorAll('tbody > tr[class="linhaPar"]')
        );

        for (const linha of linhasPares) {
          const colunas = linha?.children;

          const lenghtColumnOnClick = colunas[4]?.children?.length;

          const turma = {
            nome: colunas[0]?.innerHTML,
            turma: colunas[1]?.innerHTML,
            cargaHoraria: colunas[2]?.innerHTML,
            horario: colunas[3]?.innerHTML,
            onClickText:
              lenghtColumnOnClick === 2
                ? colunas[4]?.children?.item(1)?.getAttribute('onclick')
                : colunas[4]?.children?.item(0)?.getAttribute('onclick'),
          };

          arrayTurmas.push(turma);
        }

        return arrayTurmas;
      });

      sigifc.classes = turmas;
      return turmas;
    } catch (e) {
      console.log('on getClasses', e);
    }
  },

  goToClass: async (className = '', classList = []) => {
    try {
      const classes = classList.length ? classList : sigifc.classes;
      const upperCaseClassName = className.toUpperCase();

      const classFound = classes.find((classe) =>
        classe.nome.includes(upperCaseClassName)
      );

      if (classFound) {
        sigifc.classeAtual = classFound.nome;
        const classOnClickText = classFound.onClickText;
        await clickOnAnchorWithOnClickText(sigifc.page, classOnClickText);
      }
    } catch (e) {
      console.log(`Error when going to class ${className}`, e);
    }
  },

  goToClassMaterialsPage: async (classe) => {
    try {
      await sigifc.page.waitForTimeout(5000);
      // await sigifc.page.waitForNavigation({ waitUntil: 'networkidle2' });

      await sigifc.page.evaluate(() =>
        document.querySelector('div[class*=itemMenuHeaderMateriais]')?.click()
      );
      // await sigifc.page.click('div[class*=itemMenuHeaderMateriais]');
      // await sigifc.page.waitForTimeout(5000);
      // const onClickText = await sigifc.page.evaluate(() => {
      //   const anchorElement = Array.from(document.querySelectorAll('a')).find(
      //     (a) => a.children?.item(0)?.innerHTML?.includes('Arquivos')
      //   );
      //   const anchorText = anchorElement?.getAttribute('onclick');
      //   return anchorText;
      // });
      await sigifc.page.evaluate(() =>
        Array.from(document.querySelectorAll('a'))
          .find((a) => a.children?.item(0)?.innerHTML?.includes('Arquivos'))
          ?.click()
      );

      // await clickOnAnchorWithOnClickText(sigifc.page, onClickText);
      // await sigifc.page.waitForTimeout(3000);
    } catch (e) {
      console.log(`Error when opening materials of ${classe}`, e);
    }
  },

  downloadAllFiles: async (classe) => {
    try {
      await sigifc.page.waitForTimeout(5000);
      // await sigifc.page.waitForNavigation({ waitUntil: 'networkidle2' });
      const downloadAllFilesSelector = await sigifc.page.evaluate(() => {
        const anchorElement = Array.from(document.querySelectorAll('a')).find(
          (a) => a.innerHTML?.includes('Baixar todos os arquivos')
        );
        const anchorText = anchorElement?.getAttribute('onclick');
        return anchorText;
      });

      if (!downloadAllFilesSelector) {
        console.log(`No files found for ${classe}`);
        return;
      }

      await clickOnAnchorWithOnClickText(sigifc.page, downloadAllFilesSelector);
      await sigifc.page.waitForTimeout(3000);
      console.log(`Files of ${classe} downloaded with success`);
    } catch (e) {
      console.log(`Error when downloading files of ${classe}`, e);
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

module.exports = sigifc;
