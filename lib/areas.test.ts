import { describe, expect, it } from 'vitest'
import { distinctAreas } from './areas'
import { AREAS } from './filters'

describe('distinctAreas', () => {
  it('ger unika områden i svensk ordning', () => {
    expect(distinctAreas(['Södermalm', 'Vasastan', ' Södermalm ', null, 'Östermalm', 'Aspudden', ''])).toEqual([
      'Aspudden', 'Södermalm', 'Vasastan', 'Östermalm',
    ])
  })

  it('slår ihop områden som bara skiljer i versaler', () => {
    expect(distinctAreas(['City', 'city'])).toEqual(['City'])
  })

  it('faller tillbaka på kända områden utan data', () => {
    expect(distinctAreas([null, undefined])).toEqual([...AREAS])
  })
})
