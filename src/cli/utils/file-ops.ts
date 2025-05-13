import fs from 'fs'
import path from 'path'

export const fileOps = {
  existsSync: fs.existsSync,
  mkdirSync: fs.mkdirSync,
  mkdirAsync: fs.promises.mkdir,
  writeFileSync: fs.writeFileSync,
  writeFileAsync: fs.promises.writeFile,
  readFileSync: fs.readFileSync,
  readFileAsync: fs.promises.readFile,
  unlinkAsync: fs.promises.unlink,
  joinPath: (...paths: string[]) => path.join(...paths)
}
