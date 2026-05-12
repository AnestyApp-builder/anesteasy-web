import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..', 'app', 'api')

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (f === 'route.ts') {
      let c = fs.readFileSync(p, 'utf8')
      if (!/import ['"]server-only['"]/.test(c)) {
        fs.writeFileSync(p, "import 'server-only'\n" + c)
        console.log('prepended:', path.relative(path.join(__dirname, '..'), p))
      }
    }
  }
}

walk(root)
