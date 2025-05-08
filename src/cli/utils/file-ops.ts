import fs from 'fs'
import path from 'path'

export const fileOps = {
  existsSync: fs.existsSync,
  mkdirSync: fs.mkdirSync,
  writeFileSync: fs.writeFileSync,
  readFileSync: fs.readFileSync,
  joinPath: path.join
}