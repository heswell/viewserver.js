const {
    DataView, 
    DataTypes, 
    metadataKeys,
    IN,
    STARTS_WITH, 
    NOT_STARTS_WITH
} = require('../dist/index.js');

const {
    getInstrumentTable,
    instrumentColumns: columns,
    getTestTable,
    columns: test_columns
} = require('../test-data.js');

const {FILTER_DATA} = DataTypes;

const u = undefined;

describe('construction', () => {
    test('construction', () => {
        let view = new DataView(getInstrumentTable(), { columns });
        expect(view.rowSet.size).toBe(1247)

        view = new DataView(getTestTable(), { columns: test_columns });
        expect(view.rowSet.size).toBe(24)
    })
})

describe('groupBy', () => {
    test('group by single col', () => {

        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        let { rows } = view.groupBy([['Sector', 'asc']]);

        expect(rows.map(d => d.slice(0, 5))).toEqual([
            [100, 0, -1, 27, 'Basic Industries'],
            [101, 0, -1, 79, 'Capital Goods'],
            [102, 0, -1, 35, 'Consumer Durables'],
            [103, 0, -1, 40, 'Consumer Non-Durables'],
            [104, 0, -1, 167, 'Consumer Services'],
            [105, 0, -1, 29, 'Energy'],
            [106, 0, -1, 142, 'Finance'],
            [107, 0, -1, 324, 'Health Care'],
            [108, 0, -1, 50, 'Miscellaneous'],
            [109, 0, -1, 24, 'Public Utilities'],
            [110, 0, -1, 303, 'Technology'],
            [111, 0, -1, 27, 'Transportation']
        ]);
    });

});


describe('setGroupState', () => {
    
    test('single col groupby, expandAll', () => {
        const view = new DataView(getInstrumentTable(), { columns });

        view.groupBy([['Sector', 'asc']]);
        let {size} = view.setRange({ lo: 0, hi: 25 });
        expect(size).toEqual(12);

        ({size} = view.setGroupState({'*': true}));
        expect(size).toEqual(1259);

        ({size} = view.setGroupState({}));
        expect(size).toEqual(12);
        
    })

})

describe('updateRow', () => {
    const table = getTestTable();
    test('update data, no grouping', () => {

        const view = new DataView(table, { columns: test_columns });
        view.setRange({ lo: 0, hi: 10 });
        table.update(4, 6, 9.5, 7, 50);
        const { updates } = view.updates;

        expect(updates.length).toBe(1);
        expect(updates[0]).toEqual({ type: 'update', updates: [[104, 6, 9, 9.5, 7, 100, 50]] })

    });
});

describe('insertRow', () => {
    const table = getTestTable();
    test('insert into single col grouping, all groups collapsed. Group count update, via updateQueue', () => {
        const view = new DataView(table, { columns: test_columns });
        let { rows, size } = view.setRange({ lo: 0, hi: 10 });
        expect(size).toBe(24);
        ({ rows, size } = view.groupBy([['Group 1', 'asc']]));
        // onsole.log(`${join(rows)}`)
        expect(size).toBe(3);
        expect(rows.map(d => d.slice(0, 5))).toEqual([
            [100, 0, -1, 8, 'G1'],
            [101, 0, -1, 8, 'G2'],
            [102, 0, -1, 8, 'G3']
        ]);
        table.insert(['key25', 'G3', 'O2', 'T3', 5, 100]);
        const { updates } = view.updates;
        expect(updates.length).toBe(1);
        expect(updates[0]).toEqual({
            type: 'update',
            updates: [[102, metadataKeys.COUNT, 9]]
        });

    });

    test('insert into single col grouping, groups expanded. Group count update, via updateQueue', () => {
        const table = getTestTable();
        const view = new DataView(table, { columns: test_columns });
        let { size } = view.setRange({ lo: 0, hi: 10 });
        expect(size).toBe(24);
        ({ size } = view.groupBy([['Group 1', 'asc']]));
        // onsole.log(`${join(rows)}`);
        view.setGroupState({ 'G1': true });
        view.setGroupState({ 'G1': true, 'G2': true });
        view.setGroupState({ 'G1': true, 'G2': true, 'G3': true });

        table.insert(['key25', 'G1', 'O2', 'T3', 5, 100]);
        const { updates } = view.updates;
        expect(updates.length).toBe(1);
        expect(updates[0].type).toBe('rowset');
        expect(updates[0].size).toBe(28);
        expect(updates[0].rows.map(d => d.slice(0, 5))).toEqual([
            [100, 0, +1,  9, 'G1'],
            [101, 0,  0,  0, 'key01'],
            [102, 0,  0,  0, 'key02'],
            [103, 0,  0,  0, 'key03'],
            [104, 0,  0,  0, 'key04'],
            [105, 0,  0,  0, 'key05'],
            [106, 0,  0,  0, 'key06'],
            [107, 0,  0,  0, 'key07'],
            [108, 0,  0,  0, 'key08'],
            [109, 0,  0,  0, 'key25']
        ]);
    });
});

describe('getFilterData', () => {

    const addCounts = groups => groups.map(group => group[3]).reduce((a, b) => a + b)

    test('no groupBy, no filters, getFilterData', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        let results = view.getFilterData({ name: 'IPO' }, { lo: 0, hi: 10 });
        expect(results).toEqual({
            dataType: 'filterData',
            rows: [
                [0, 0, 0, 0, '1972', 1,u,u,u,u,'1972', 4,  4],
                [1, 0, 0, 0, '1973', 1,u,u,u,u,'1973', 1,  1],
                [2, 0, 0, 0, '1980', 1,u,u,u,u,'1980', 2,  2],
                [3, 0, 0, 0, '1981', 1,u,u,u,u,'1981', 7,  7],
                [4, 0, 0, 0, '1982', 1,u,u,u,u,'1982', 4,  4],
                [5, 0, 0, 0, '1983', 1,u,u,u,u,'1983', 13, 13],
                [6, 0, 0, 0, '1984', 1,u,u,u,u,'1984', 7,  7],
                [7, 0, 0, 0, '1985', 1,u,u,u,u,'1985', 6,  6],
                [8, 0, 0, 0, '1986', 1,u,u,u,u,'1986', 24, 24],
                [9, 0, 0, 0, '1987', 1,u,u,u,u,'1987', 14, 14]
            ],
            range: { lo: 0, hi: 10 },
            size: 38,
            offset: 0,
            stats : {
                totalRowCount: 38,
                totalSelected: 38, 
                filteredRowCount: 38,
                filteredSelected: 38
            }
        })

    });

    test('no groupBy, filter on same column, getFilterData', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        view.filter({type: IN, colName: 'Sector', values:['Basic Industries']});
        let {size} = view.getFilterData({ name: 'Sector' });
        expect(size).toEqual(12);
        const {rows} = view.setRange({lo:0,  hi:10}, true, DataTypes.FILTER_DATA);
        const {SELECTED} = metadataKeys;
        expect(rows[0][SELECTED]).toEqual(1);
    });

    test('no groupBy, getFilterData, then search', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 10 });

        let results = view.getFilterData({ name: 'IPO' },{ lo: 0, hi: 10 });
        [, results] = view.filter({colName: 'name', type: STARTS_WITH, value: '198'}, DataTypes.FILTER_DATA, true);
        expect(results).toEqual({
            dataType: 'filterData',
            rows: [
                [0, 0, 0, 0, '1980', 1, u,u,u,u,'1980', 2,  2  ],
                [1, 0, 0, 0, '1981', 1, u,u,u,u,'1981', 7,  7  ],
                [2, 0, 0, 0, '1982', 1, u,u,u,u,'1982', 4,  4  ],
                [3, 0, 0, 0, '1983', 1, u,u,u,u,'1983', 13, 13 ],
                [4, 0, 0, 0, '1984', 1, u,u,u,u,'1984', 7,  7  ],
                [5, 0, 0, 0, '1985', 1, u,u,u,u,'1985', 6,  6  ],
                [6, 0, 0, 0, '1986', 1, u,u,u,u,'1986', 24, 24 ],
                [7, 0, 0, 0, '1987', 1, u,u,u,u,'1987', 14, 14 ],
                [8, 0, 0, 0, '1988', 1, u,u,u,u,'1988', 4,  4  ],
                [9, 0, 0, 0, '1989', 1, u,u,u,u,'1989', 10, 10 ]
            ],
            range: { lo: 0, hi: 10, reset: true, bufferSize: 0 },
            size: 10,
            offset: 0,
            stats : {
                totalRowCount: 38,
                totalSelected: 38,
                filteredRowCount: 10,
                filteredSelected: 10
            }

        })

    });

    test('no groupBy, getFilterData, then search, then repeat with another column', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 10 });
        let results = view.getFilterData({ name: 'IPO' });
        [, results] = view.filter({colName: 'name', type: STARTS_WITH, value: '198'}, DataTypes.FILTER_DATA, true);
        results = view.getFilterData({ name: 'Sector' },{ lo: 0, hi: 10 });

        expect(results).toEqual({
            dataType: 'filterData',
            rows:[
                [0, 0, 0, 0, 'Basic Industries', 1,u,u,u,u,'Basic Industries', 27, 27],
                [1, 0, 0, 0, 'Capital Goods', 1,u,u,u,u,'Capital Goods', 79, 79],
                [2, 0, 0, 0, 'Consumer Durables', 1,u,u,u,u,'Consumer Durables', 35, 35],
                [3, 0, 0, 0, 'Consumer Non-Durables',1,u,u,u,u,'Consumer Non-Durables', 40, 40],
                [4, 0, 0, 0, 'Consumer Services', 1,u,u,u,u,'Consumer Services',     167, 167 ],
                [5, 0, 0, 0, 'Energy', 1,u,u,u,u,'Energy',29,29],
                [6, 0, 0, 0, 'Finance', 1,u,u,u,u,'Finance',142, 142], 
                [7, 0, 0, 0, 'Health Care', 1,u,u,u,u,'Health Care',324,324],
                [8, 0, 0, 0, 'Miscellaneous', 1,u,u,u,u,'Miscellaneous',50,50],  
                [9, 0, 0, 0, 'Public Utilities', 1,u,u,u,u,'Public Utilities',24,24]],
            range: { lo: 0, hi: 10 },
            size: 12,
            offset: 0,
            stats : {
                totalRowCount: 12,
                totalSelected: 12,
                filteredRowCount: 12,
                filteredSelected: 12
            }
        })

    });

    test('when filter is cleared on col1, distinct values on cols are refreshed', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.filter({type: IN, colName: 'Sector', values: ['Basic Industries']});
        view.setRange({lo: 0,hi: 30}, false);
        view.getFilterData({ name: 'Industry' });

        let {size, rows} = view.setRange({ lo: 0, hi: 3 }, true, DataTypes.FILTER_DATA);
        expect(size).toEqual(109);
        expect(rows).toEqual([
            [0, 0, 0, 0, 'Advertising', 1,u,u,u,u,'Advertising',            0, 10],
            [1, 0, 0, 0, 'Aerospace', 1,u,u,u,u,'Aerospace',              0, 3],
            [2, 0, 0, 0, 'Agricultural Chemicals', 1,u,u,u,u,'Agricultural Chemicals', 2, 2]
        ])

        // this actually returns a new filterResultset as second param
        view.filter(null);

        // As we still have this this will reset the range
        view.getFilterData({ name: 'Industry' });

        // Note, we pass useDelta : true. This should work despite the fact that we have already 
        // returned the rows for 0:3 above, because the rows have been changed
        ({size, rows} = view.setRange({ lo: 0, hi: 3 }, true, DataTypes.FILTER_DATA));
        expect(size).toEqual(109);
        expect(rows).toEqual([
            [0, 0, 0, 0, 'Advertising', 1,u,u,u,u,'Advertising',10, 10],
            [1, 0, 0, 0, 'Aerospace', 1,u,u,u,u,'Aerospace', 3,  3],
            [2, 0, 0, 0, 'Agricultural Chemicals', 1,u,u,u,u,'Agricultural Chemicals', 2,  2],
        ])
    
    })

    test('no groupBy, no filters, getFilterData for numeric (binned) column', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        let {rows} = view.getFilterData({ name: 'Price' });
        const counts = rows.map(v => v[3]);
        expect(counts.reduce((a,b) => a+b)).toEqual(1247);

    });


    test('groupedRowset, single col grouping, apply filter to col then re-request filter data', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        view.groupBy([['Sector', 'asc']]);
        let results = view.getFilterData({ name: 'Industry' });
        results = view.setRange({ lo: 0, hi: 9 }, true, DataTypes.FILTER_DATA);
        expect(results.rows).toEqual([
            [0, 0, 0, 0, 'Advertising', 1,u,u,u,u,                      'Advertising',10, 10],
            [1, 0, 0, 0, 'Aerospace', 1,u,u,u,u,                        'Aerospace',3,3],
            [2, 0, 0, 0, 'Agricultural Chemicals', 1,u,u,u,u,           'Agricultural Chemicals',2,2],
            [3, 0, 0, 0, 'Air Freight/Delivery Services', 1,u,u,u,u,    'Air Freight/Delivery Services',7,7],
            [4, 0, 0, 0, 'Aluminum', 1,u,u,u,u,                         'Aluminum',                      1,1],
            [5, 0, 0, 0, 'Apparel', 1,u,u,u,u,                          'Apparel',                       9,9],
            [6, 0, 0, 0, 'Auto Manufacturing', 1,u,u,u,u,               'Auto Manufacturing',            1,1],
            [7, 0, 0, 0, 'Auto Parts:O.E.M.', 1,u,u,u,u,                'Auto Parts:O.E.M.',             1,1],
            [8, 0, 0, 0, 'Automotive Aftermarket', 1,u,u,u,u,           'Automotive Aftermarket',        5,5]
        ])

        const values = [];
        let [{ size }] = view.filter({ type: IN, colName: 'Industry', values })
        expect(size).toEqual(0);

        values.push('Advertising')
        let [{ rows }] = view.filter({ type: IN, colName: 'Industry', values });
        expect(addCounts(rows)).toBe(10)

        values.push('Apparel');
        ([{ rows }] = view.filter({ type: IN, colName: 'Industry', values }));
        expect(addCounts(rows)).toBe(19);

        values.push('Auto Manufacturing');
        ([{ rows }] = view.filter({ type: IN, colName: 'Industry', values }));
        expect(addCounts(rows)).toBe(20);

        values.push('Automotive Aftermarket');
        ([{ rows }] = view.filter({ type: IN, colName: 'Industry', values }));
        expect(addCounts(rows)).toBe(25);

        results = view.getFilterData({ name: 'Industry' });
        results = view.setRange({ lo: 0, hi: 9 }, true, DataTypes.FILTER_DATA); 

        const {IDX, SELECTED} = metadataKeys;

        const selectedIndices = results.rows.filter(row => row[SELECTED]).map(row => row[IDX]);
        expect(selectedIndices).toEqual([0, 5, 6, 8])

    });

    test('groupedRowset, single col grouping, apply filter to col, request filter adta for another col  then re-request filter data', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        view.groupBy([['Sector', 'asc']]);
        let results = view.getFilterData({ name: 'Industry' });
        results = view.setRange({ lo: 0, hi: 9 }, true, DataTypes.FILTER_DATA);

        let [{ size }] = view.filter({ type: IN, colName: 'Industry', values: [] })
        expect(size).toEqual(0);

        let [{ rows }] = view.filter({
            type: IN, colName: 'Industry', values:
                ['Advertising', 'Apparel', 'Auto Manufacturing', 'Automotive Aftermarket']
        });
        expect(addCounts(rows)).toBe(25)

        results = view.getFilterData({ name: 'IPO' });
        results = view.setRange({ lo: 0, hi: 9 }, true, DataTypes.FILTER_DATA);

        results = view.getFilterData({ name: 'Industry' });
        results = view.setRange({ lo: 0, hi: 9 }, true, DataTypes.FILTER_DATA);
        const {IDX, SELECTED} = metadataKeys;
        const selectedIndices = results.rows.filter(row => row[SELECTED]).map(row => row[IDX]);
        expect(selectedIndices).toEqual([0, 5, 6, 8])

    });
});

describe('filter filterData (SEarch)', () => {
    test('initial search, on filtered column, extend search text', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        view.getFilterData({ name: 'Name' });
        view.filter({ type: IN, colName: 'Name', values: ['Google Inc.'] });
        view.filter({colName: 'name', type: STARTS_WITH, value: 'go'}, FILTER_DATA, true);
        let { rows } = view.setRange({ lo: 0, hi: 10 }, true, FILTER_DATA);

        const {IDX, SELECTED} = metadataKeys;
        const selectedIndices = rows.filter(row => row[SELECTED]).map(row => row[IDX]);
        expect(selectedIndices).toEqual([3]);

        expect(rows).toEqual([
            [0, 0, 0, 0, 'GoPro, Inc.', 0,u,u,u,u,'GoPro, Inc.',           1, 1],
            [1, 0, 0, 0, 'Gogo Inc.', 0,u,u,u,u,'Gogo Inc.',             1, 1],
            [2, 0, 0, 0, 'Golar LNG Partners LP', 0,u,u,u,u,'Golar LNG Partners LP', 1, 1],
            [3, 0, 0, 0, 'Google Inc.', 1,u,u,u,u,'Google Inc.',           1, 1],
            [4, 0, 0, 0, 'Gordmans Stores, Inc.', 0,u,u,u,u,'Gordmans Stores, Inc.', 1, 1]
        ]);
        const [, {stats}] = view.filter({colName: 'name', type: STARTS_WITH, value: 'goo'}, FILTER_DATA, true);
        expect(stats).toEqual({
            totalRowCount: 1241,
            totalSelected: 1,
            filteredRowCount: 1,
            filteredSelected: 1
        });
        ({ rows } = view.setRange({ lo: 0, hi: 10 }, false, FILTER_DATA));
        expect(rows).toEqual([
            [0, 0, 0, 0, 'Google Inc.', 1,u,u,u,u,'Google Inc.', 1, 1, ]
        ]);

    });

    test('change search text entirely', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        view.getFilterData({ name: 'Name' });
        view.filter({ type: IN, colName: 'Name', values: ['Google Inc.'] });
        view.filter({colName: 'name', type: STARTS_WITH, value: 'Goo'}, FILTER_DATA, true);

        view.filter({colName: 'name', type: STARTS_WITH, value: 'F'}, FILTER_DATA, true);
        view.setRange({ lo: 0, hi: 10 }, true, FILTER_DATA);

        view.filter({ type: IN, colName: 'Name', values: ['Google Inc.', 'Facebook, Inc.'] });

        view.filter({colName: 'name', type: STARTS_WITH, value: 'Fa'}, FILTER_DATA, true);
        let { rows } = view.setRange({ lo: 0, hi: 10 }, false, FILTER_DATA);
        
        const {IDX, SELECTED} = metadataKeys;
        let selectedIndices = rows.filter(row => row[SELECTED]).map(row => row[IDX]);
        expect(selectedIndices).toEqual([1]);

        view.filter({colName: 'name', type: STARTS_WITH, value: 'F'}, FILTER_DATA, true);
        ({ rows } = view.setRange({ lo: 0, hi: 10 }, false, FILTER_DATA));
        selectedIndices = rows.filter(row => row[SELECTED]).map(row => row[IDX]);
        expect(selectedIndices).toEqual([5]);

    });

    test('clear search', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        view.getFilterData({ name: 'Name' });
        view.filter({ type: IN, colName: 'Name', values: ['Google Inc.'] });
        view.filter({colName: 'name', type: STARTS_WITH, value: 'F'}, FILTER_DATA, true);
        let { size, rows } = view.setRange({ lo: 0, hi: 10 }, false, DataTypes.FILTER_DATA);
        expect(size).toBe(46);
        view.filter({colName: 'name', type: STARTS_WITH, value: ''}, FILTER_DATA, true);
        ({ size, rows } = view.setRange({ lo: 0, hi: 500 }, false, DataTypes.FILTER_DATA));
        const {IDX, SELECTED} = metadataKeys;
        let selectedIndices = rows.filter(row => row[SELECTED]).map(row => row[IDX]);
        expect(size).toBe(1241);
        expect(selectedIndices).toEqual([492]);

    })
});

describe('combined features', () => {
    test('groupedRowset, single col grouping, filter, then expand groups', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        view.groupBy([['Sector', 'asc']]);
        view.filter({
            type: IN, colName: 'Industry', values:
                ['Advertising', 'Automotive Aftermarket']
        });
        let results = view.setGroupState({ 'Consumer Durables': true });
        expect(results.size).toBe(7);
    });

    test('add then remove groupBy', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        view.groupBy([['Sector', 'asc']]);
        let { size } = view.groupBy(null);
        expect(size).toBe(1247);

    });

    test('groupedRowset, group by col 1, filter on col2 then add col2 to group', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        view.groupBy([['Sector', 'asc']]);

        view.filter({
            type: IN, colName: 'Industry', values:
                ['Advertising', 'Apparel', 'Auto Manufacturing', 'Automotive Aftermarket']
        });
        let { rows, size } = view.groupBy([['Sector', 'asc'], ['Industry', 'asc']]);
        expect(size).toBe(5);
        const N = null;
        expect(rows).toEqual([
            // Not sure it is correct that IPO has 0 rather than null - should be no aggregation
            [100, 0, -2, 1, 'Capital Goods', 0, N, 13, 1, u,          N, N, 203.77,             25550000000, N, 'Capital Goods',         N],
            [101, 0, -2, 4, 'Consumer Durables', 0, N, 34, 4, u,      N, N, 43.997499999999995, 9418980000,  N, 'Consumer Durables',     N],
            [102, 0, -2, 9, 'Consumer Non-Durables', 0, N, 49, 9, u,  N, N, 39.92777777777778,  25881370000, N, 'Consumer Non-Durables', N],
            [103, 0, -2, 5, 'Consumer Services', 0, N, 65, 5, u,      N, N, 20.21,              4078390000,  N, 'Consumer Services',     N],
            [104, 0, -2, 6, 'Technology', 0, N, 142, 6, u,            N, N, 18.318333333333335, 9415730000,  N, 'Technology',            N]
        ]);

        ({ rows, size } = view.setGroupState({ 'Capital Goods': true }));
        expect(size).toBe(6);
        expect(rows).toEqual([                                                  // [Symbol, Name, Price, MarketCap,IPO, Sector, Industry]]
            [100, 0, +2, 1, 'Capital Goods', 0, N, 13, 1, u,                      N, N, 203.77,             25550000000, N, 'Capital Goods', N], 
            [101, 0, -1, 1, 'Capital Goods/Auto Manufacturing',0, 12, 29,1,0,     N, N, 203.77,             25550000000, N, 'Capital Goods', 'Auto Manufacturing'],
            [102, 0, -2, 4, 'Consumer Durables', 0, N, 34, 4, u,                  N, N, 43.997499999999995, 9418980000,  N, 'Consumer Durables',     N],
            [103, 0, -2, 9, 'Consumer Non-Durables', 0, N, 49, 9,u,               N, N, 39.92777777777778,  25881370000, N, 'Consumer Non-Durables', N],
            [104, 0, -2, 5, 'Consumer Services',0, N, 65,5, u,                    N, N, 20.21,              4078390000,  N, 'Consumer Services',     N],
            [105, 0, -2, 6, 'Technology',0, N, 142, 6, u,                         N, N, 18.318333333333335, 9415730000,  N, 'Technology', N]
        ]);

        ({ rows, size } = view.setGroupState({ 'Capital Goods': false }));
        expect(size).toBe(5);

    });

    test('group by filtered IPO, getDistinctValues for Industry', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        view.filter({ type: IN, colName: 'IPO', values: [2007, 2010, 2011, 2012, 2013, 2014] });

        let { size, rows } = view.groupBy([['IPO', 'asc']]);
        expect(size).toBe(6);

        view.getFilterData({ name: 'Industry' });
        ({size, rows} = view.setRange({ lo: 0, hi: 200 }, true, DataTypes.FILTER_DATA));
        const industryValues = rows.reduce((a,b) => a + (b[11] ? 1 : 0), 0);
        expect(industryValues).toBe(82);
        expect(size).toBe(109);

    });

    test('getFilteredData for Name, apply filter, then getFilteredData for Sector', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        let { size } = view.getFilterData({ name: 'Name' });
        expect(size).toBe(1241);
        view.filter({ type: IN, colName: 'Name', values: ['ABAXIS, Inc.', 'Apple Inc.'] });
        view.getFilterData({ name: 'Sector' });
        ({ size } = view.setRange({ lo: 0, hi: 10 }, true, DataTypes.FILTER_DATA));
    });

    test('group by filtered col, remove grouping, filter should still be in place', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        let { size } = view.filter({ type: IN, colName: 'Sector', values: ['Consumer Services', 'Finance', 'Health Care'] });
        ({ size } = view.groupBy([['Sector', 'asc']]));
        expect(size).toBe(3);
        ({ size } = view.groupBy(null));
        expect(size).toBe(633);
    });

    test('expand top-level group, scroll away from top and remove lower-level group', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        let { size, rows } = view.groupBy([['Sector', 'asc'], ['Industry', 'asc']]);
        ({ rows, size } = view.setGroupState({ 'Consumer Services': true }));
        expect(size).toBe(42);
        ({ rows, size } = view.setRange({ lo: 17, hi: 34 }));

        ({ size, rows } = view.groupBy([['Sector', 'asc']]));
        expect(size).toBe(179);
        // change of groupingbresets scroll position to top
        expect(rows.map(row => row.slice(0, 5))).toEqual([
            [100, 0, -1, 27, 'Basic Industries'],
            [101, 0, -1, 79, 'Capital Goods'],
            [102, 0, -1, 35, 'Consumer Durables'],
            [103, 0, -1, 40, 'Consumer Non-Durables'],
            [104, 0, 1, 167, 'Consumer Services'],
            [105, 0, 0, 0, 'ANGI'],
            [106, 0, 0, 0, 'ISIG'],
            [107, 0, 0, 0, 'NCMI'],
            [108, 0, 0, 0, 'SALE'],
            [109, 0, 0, 0, 'MNRO'],
            [110, 0, 0, 0, 'HMHC'],
            [111, 0, 0, 0, 'SCHL'],
            [112, 0, 0, 0, 'BBGI'],
            [113, 0, 0, 0, 'CETV'],
            [114, 0, 0, 0, 'CTCM'],
            [115, 0, 0, 0, 'CMLS'],
            [116, 0, 0, 0, 'EMMS']
        ])
   });

});

// select removed replaced with STARTS_WITH filtering
describe('filter', () => {
    test('exclude starts_with, no existing filter', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });

        view.getFilterData({ name: 'Name' });
        view.getFilterData({ name: 'Name' }, 'ab');
        let { size, rows } = view.setRange({ lo: 0, hi: 10 }, true, DataTypes.FILTER_DATA);
        view.filter({type: NOT_STARTS_WITH, colName: 'Name', value: 'ab'});
        ({ size } = view.setRange({ lo: 0, hi: 10 }, true));

        expect(size).toBe(1244);
        view.getFilterData({ name: 'Name' });
        ({ size, rows } = view.setRange({ lo: 0, hi: 30 }, true, DataTypes.FILTER_DATA));
        expect(size).toBe(1241)
        const {SELECTED} = metadataKeys;
        expect(rows.map(row => row[SELECTED]).filter(selected => selected === 0).length).toEqual(3);

    });

    test('include starts_with, no existing filter', () => {
        const view = new DataView(getInstrumentTable(), { columns });
        view.setRange({ lo: 0, hi: 17 });
        view.getFilterData({ name: 'Name' });
        let [{ size }] = view.filter({ type: IN, colName: 'Name', values: [] });
        expect(size).toBe(0);
        view.getFilterData({ name: 'Name' }, 'ab');
        ({ size } = view.setRange({ lo: 0, hi: 10 }, true, DataTypes.FILTER_DATA));
        
        ([{ size }] = view.filter({type: STARTS_WITH, colName: 'Name', value: 'ab'}));
        
        expect(size).toBe(3);

    });
})
