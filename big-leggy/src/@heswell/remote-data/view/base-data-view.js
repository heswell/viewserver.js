export default class BaseDataView {

  constructor(){
    this.columns = null;
    this.meta = null;
    this.range = null;

    this.size = 0;
    this.dataRows = [];

  }

  set rows(newRows) {
    this.dataRows = newRows;
  }

  get rows() {
    return this.dataRows;
  }

  processData(rows,size, offset){

    const mergedRows = mergeAndPurge(this.range, this.rows, offset, rows, size, this.meta);
    this.size = size;
    return this.rows = mergedRows;

  }

}

/*--------------------------------------------------------

Utility functions

  --------------------------------------------------------*/

// TODO create a pool of these and reuse them
function emptyRow(idx, { IDX, count }) {
  const row = Array(count);
  row[IDX] = idx;
  return row;
}

function mergeAndPurge({ lo, hi }, rows, offset = 0, newRows, size, meta) {
  // console.groupCollapsed(`mergeAndPurge range: ${lo} - ${hi} 
  //  old   rows: [${rows.length ? rows[0][0]: null} - ${rows.length ? rows[rows.length-1][0]: null}]
  //  new   rows: [${newRows.length ? newRows[0][0]: null} - ${newRows.length ? newRows[newRows.length-1][0]: null}]
  //     `);
  const { IDX } = meta;
  const results = [];
  const low = lo + offset;
  const high = Math.min(hi + offset, size + offset);

  let idx;
  let row;

  for (let i = 0; i < newRows.length; i++) {
    if (row = newRows[i]) {
      idx = row[IDX];

      if (idx >= low && idx < high) {
        results[idx - low] = newRows[i];
      }
    }
  }

  for (let i = 0; i < rows.length; i++) {
    if (row = rows[i]) {
      idx = row[IDX];
      if (idx >= low && idx < high && results[idx - low] === undefined) {
        results[idx - low] = rows[i];
      }
    }
  }


  // make sure the resultset contains entries for the full range
  // TODO make this more efficient
  const rowCount = hi - lo;
  for (let i = 0; i < rowCount; i++) {
    if (results[i] === undefined) {
      results[i] = emptyRow(i + low, meta);
    }
  }
  // console.table(results);
  // console.groupEnd();
  return results;

}
