import { outro, intro, select, text, confirm, multiselect, isCancel } from '@clack/prompts'
import colors from 'picocolors'
import { trytm } from '@bdsqqq/try'

import { COMMIT_TYPES } from './commit-types.js'
import { getChangedFiles, getStagedFiles, gitAdd, gitCommit } from './git.js'
import { exitProgram } from './utils.js'

const [stageddFiles, errorStageddFiles] = await trytm(getStagedFiles())
const [changedFiles, errorChangedfiles] = await trytm(getChangedFiles())

intro(
  colors.inverse(' 🚀Asistente para la creación de commits ')
)

if (errorChangedfiles ?? errorStageddFiles) {
  outro(colors.red('Error: Comprueba que estás en un repositorio de git'))
  process.exit(1)
}

if (stageddFiles.length === 0 && changedFiles.length > 0) {
  const files = await multiselect({
    message: colors.cyan('Selecciona los arhivos que quieres añadir al commit:'),
    options: changedFiles.map(file => ({
      value: file,
      label: file
    }))
  })

  if (isCancel(files)) exitProgram()

  await gitAdd({ files })
}

const commitType = await select({
  message: colors.cyan('Selecciona el tipo de commit:'),
  options: Object.entries(COMMIT_TYPES).map(([key, value]) => ({
    value: key,
    label: `${value.emoji} ${key.padEnd(8, ' ')} ∙ ${value.description}`
  }))
})
if (isCancel(commitType)) exitProgram()

const commitMsg = await text({
  message: colors.cyan('Introduce el mensaje del commit:'),
  validate: (value) => {
    if (value.length === 0) { return colors.red('El mensaje no puede estar vacío.') }

    if (value.length > 50) { return colors.red('El mensaje no puede tener mas de 50 caracteres.') }
  }
})

if (isCancel(commitMsg)) exitProgram()

const { emoji, release } = COMMIT_TYPES[commitType]

let breakingChange = false
if (release) {
  breakingChange = await confirm({
    initialValue: false,
    message: `${colors.cyan('¿Tiene este commit cambios que rompen la compatibilidad anterior?')}
      ${colors.yellow('Si la respuesta en sí, debería crear un commit con el tipo "BREAKING CHANGE" y al hacer release se publicará una nueva versión major.')}
    `
  })
  if (isCancel(breakingChange)) exitProgram()
}

let commit = `${emoji} ${commitType}: ${commitMsg}`
commit = breakingChange ? `${commit} [breaking change]` : commit

const shouldContinue = await confirm({
  initialValue: true,
  message: `${colors.cyan('¿Quieres crear el commit con el siguiente mensaje?')}
  
    ${colors.green(colors.bold(commit))}`
})

if (!shouldContinue) {
  exitProgram()
}

await gitCommit({ commit })

outro('✔ Commit creado con éxito. ¡Gracias por utilizar el asistente!')
