import winston from 'winston'
import { env } from '../config/env'

const { combine, timestamp, printf, json } = winston.format

// ANSI color codes
const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  gray:    '\x1b[90m',
}

const LEVEL_COLORS: Record<string, string> = {
  error:   c.red,
  warn:    c.yellow,
  info:    c.green,
  http:    c.cyan,
  debug:   c.gray,
}

const HTTP_METHOD_COLORS: Record<string, string> = {
  GET:    c.green,
  POST:   c.blue,
  PUT:    c.yellow,
  PATCH:  c.magenta,
  DELETE: c.red,
}

const STATUS_COLOR = (status: number) => {
  if (status >= 500) return c.red
  if (status >= 400) return c.yellow
  if (status >= 300) return c.cyan
  return c.green
}

const devFormat = combine(
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp, ...meta }) => {
    const lvlColor = LEVEL_COLORS[level] ?? c.white
    const lvl = `${lvlColor}${c.bold}${level.toUpperCase().padEnd(5)}${c.reset}`
    const ts  = `${c.gray}${timestamp}${c.reset}`

    // HTTP request log line (from morgan)
    if (level === 'http' && typeof message === 'string') {
      // parse morgan combined: METHOD /path HTTP/x.x STATUS size - ms
      const match = message.match(/^(\S+) (\S+) HTTP\/[\d.]+ (\d{3}) (\S+)/)
      if (match) {
        const [, method, path, status, size] = match
        const mColor = HTTP_METHOD_COLORS[method] ?? c.white
        const sColor = STATUS_COLOR(parseInt(status))
        return `${ts} ${lvl}  ${mColor}${c.bold}${method.padEnd(6)}${c.reset} ${c.white}${path}${c.reset} ${sColor}${c.bold}${status}${c.reset} ${c.gray}${size}b${c.reset}`
      }
    }

    // Error with details
    const { err, stack, field, errors, ...rest } = meta as any
    let out = `${ts} ${lvl}  ${c.white}${message}${c.reset}`

    if (errors) {
      // Zod validation errors array
      const lines = (errors as any[]).map((e: any) => `  ${c.yellow}→ ${e.field}:${c.reset} ${e.message}`)
      out += `\n${lines.join('\n')}`
    }
    if (err)   out += `  ${c.red}${err}${c.reset}`
    if (stack && env.NODE_ENV !== 'production') out += `\n${c.gray}${stack}${c.reset}`

    const extras = Object.keys(rest)
    if (extras.length) {
      out += `  ${c.gray}${JSON.stringify(rest)}${c.reset}`
    }

    return out
  })
)

const prodFormat = combine(timestamp(), json())

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error', format: combine(timestamp(), json()) }),
    new winston.transports.File({ filename: 'logs/combined.log', format: combine(timestamp(), json()) }),
  ],
})
