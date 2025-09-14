const { buildFilter } = require('../src/controllers/segmentController');

describe('buildFilter', () => {
  test('numeric comparisons', () => {
    const rules = { condition: 'AND', rules: [
      { field: 'totalSpend', operator: '>', value: 100 },
      { field: 'visitCount', operator: '<=', value: 5 },
    ]};
    expect(buildFilter(rules)).toEqual({ $and: [
      { totalSpend: { $gt: 100 } },
      { visitCount: { $lte: 5 } },
    ]});
  });

  test('string contains/starts/ends', () => {
    const c = buildFilter({ field: 'name', operator: 'contains', value: 'john' });
    expect(c.name.$regex).toBeDefined();
    const s = buildFilter({ field: 'email', operator: 'starts_with', value: 'foo' });
    expect(String(s.email.$regex).startsWith('^')).toBe(true);
    const e = buildFilter({ field: 'email', operator: 'ends_with', value: 'bar.com' });
    expect(String(e.email.$regex).endsWith('$')).toBe(true);
  });

  test('date helpers', () => {
    const inLast = buildFilter({ field: 'lastOrderDate', operator: 'in_last_days', value: 30 });
    expect(inLast.lastOrderDate.$gte).toBeInstanceOf(Date);
    const older = buildFilter({ field: 'lastOrderDate', operator: 'older_than_days', value: 90 });
    expect(older.lastOrderDate.$lt).toBeInstanceOf(Date);
  });
});
