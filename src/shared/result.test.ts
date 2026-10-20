import { describe, expect, expectTypeOf, it } from 'vitest'
import { err, ok, type Result } from './result'

describe('Result', () => {
  it('ok carries the value', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 })
  })

  it('err carries the error', () => {
    expect(err('boom')).toEqual({ ok: false, error: 'boom' })
  })

  it('narrows on the ok discriminant', () => {
    const r: Result<number, string> = ok(1)
    if (r.ok) {
      expectTypeOf(r.value).toEqualTypeOf<number>()
    } else {
      expectTypeOf(r.error).toEqualTypeOf<string>()
    }
  })
})
