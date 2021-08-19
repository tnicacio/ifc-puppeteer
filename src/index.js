require('dotenv').config();
const ifc = require('./sigifc');

const actions = () => {
  return {
    files: (classe) => goToFilesPageAndDownloadAllFiles(classe),
    grades: (classe) => goToGradesPageAndTakeAScreenshot(classe),
  };
};

(async () => {
  // const inputAction = process.argv[2] || 'grades'; // used for debug
  const inputAction = process.argv[2]; // must be 'files' or 'grades'
  if (!validateAction(inputAction)) {
    return;
  }

  // const inputClasses = ['engenharia de software II']; // used for debug
  const inputClasses = process.argv[3]?.split(',');

  await ifc.initialize();
  await ifc.login(process.env.IFC_USERNAME, process.env.IFC_PASSWORD);
  await ifc.goToAllClassesPage();

  const classes = await ifc.getClasses();
  const classesToDoAction =
    inputClasses || classes.map((classe) => classe.name);
  console.log('Chosen classes:', classesToDoAction);

  for (const classe of classesToDoAction) {
    await ifc.goToClass(classe);
    await actions()[inputAction]?.(classe);
    await ifc.goToAllClassesPage();
  }

  await ifc.close();
})();

function validateAction(action) {
  const possibleActions = Object.keys(actions());
  if (possibleActions.includes(action)) {
    return true;
  }
  console.error(
    `Invalid action: ${action}. Possible actions: ${possibleActions.reduce(
      (acc, cur) => acc + cur + ' | ',
      ''
    )}`
  );
  process.exitCode = 1;
  process.exit();
}

async function goToFilesPageAndDownloadAllFiles(classe) {
  await ifc.goToClassFilesPage(classe);
  await ifc.downloadAllFiles(classe);
}

async function goToGradesPageAndTakeAScreenshot(classe) {
  await ifc.goToClassGradesPage(classe);
  await ifc.takeAScreenshotOfClassGrades(classe);
}
