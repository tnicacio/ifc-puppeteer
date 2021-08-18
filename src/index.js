require('dotenv').config();
const ifc = require('./sigifc.js');

(async () => {
  await ifc.initialize();
  await ifc.login(process.env.IFC_USERNAME, process.env.IFC_PASSWORD);
  await ifc.goToAllClassesPage();
  const classes = await ifc.getClasses();

  const classesToDownload =
    process.argv[2]?.split(',') || classes.map((classe) => classe.nome);

  console.log('Classes to download:', classesToDownload);

  for (const classe of classesToDownload) {
    await ifc.goToClass(classe);
    await ifc.goToClassMaterialsPage(classe);
    await ifc.downloadAllFiles(classe);
    await ifc.goToAllClassesPage();
  }

  await ifc.close();
})();
