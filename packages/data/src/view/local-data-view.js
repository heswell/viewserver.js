import {createLogger, logColor} from '@heswell/utils'
import DataView from '../store/DataView';
import { metaData } from '../store/columnUtils';
import { DataTypes } from '../store/types';
import Table from '../store/table';
import LocalUpdateQueue from '../store/localUpdateQueue';

const buildDataView = async url =>
  import(/* webpackIgnore: true */ url)
    .catch(err => console.log(`failed to load data at ${url} ${err}`))

const logger = createLogger('LocalDataView', logColor.blue);

export default class LocalDataView {
  constructor({
    url,
    tableName
  }) {
    // note: don't wait
    logger.log(`lets try and load ${url}`)
    this.eventualView = buildDataView(url);
    this.columns = null;
    this.meta = null;

    this.tableName = tableName;
    this.subscription = null;
    this.viewport = null;
    this.filterDataCallback = null;
    this.filterDataMessage = null;

    this.updateQueue = new LocalUpdateQueue();
    this.dataView = null;
    this.clientCallback = null;
    this.range = null;
  }

  async subscribe({
    tableName = this.tableName,
    columns,
    // range = defaultRange,
    // ...options
  }, callback) {

    if (!columns) throw Error("LocalDataView subscribe called without columns");
    
    // TODO options can include sort, groupBy etc
    
    this.tableName = tableName;
    this.columns = columns;
    this.meta = metaData(columns);

    const { default: data } = await this.eventualView
    const table = new Table({ data, columns });
    this.dataView = new DataView(table, {columns}, this.updateQueue);
    this.clientCallback = callback;

    if (this.range){
      this.setRange(this.range.lo, this.range.hi)
    }
  }

  unsubscribe() {

  }

  setRange(lo, hi) {
    if (this.dataView === null){
      this.range = {lo,hi}
    } else {
      this.clientCallback(this.dataView.setRange({lo, hi}, true, DataTypes.ROW_DATA));
    }
  }

  select(idx, _row, rangeSelect, keepExistingSelection) {
    this.clientCallback(this.dataView.select(idx, rangeSelect, keepExistingSelection))
  }

  group(columns) {
    this.clientCallback(this.dataView.groupBy(columns))
  }

  setGroupState(groupState) {
    this.clientCallback(this.dataView.setGroupState(groupState))
  }

  sort(columns) {
    this.clientCallback(this.dataView.sort(columns));
  }

  filter(filter, dataType = DataTypes.ROW_DATA, incremental = false) {
    // TODO filter call returns an array
    const [rowData, filterData] = this.dataView.filter(filter, dataType, incremental);
    this.clientCallback(rowData);
    if (filterData){
      if (this.clientFilterCallback){
        this.clientFilterCallback({filterData});
      } else {
        this.filterDataMessage = filterData;
      }
      }
  }

  getFilterData(column, searchText) {
      const filterData =  this.dataView.getFilterData(column, searchText)
      if (this.clientFilterCallback){
        this.clientFilterCallback({filterData});
      } else {
        this.filterDataMessage = {filterData};
      }
    }

  subscribeToFilterData(column, range, callback) {
    logger.log(`<subscribeToFilterData>`)
    this.clientFilterCallback = callback;
    this.setFilterRange(range.lo, range.hi);
    if (this.filterDataMessage) {
      callback(this.filterDataMessage);
      // do we need to nullify now ?
    }
  }

  unsubscribeFromFilterData() {
    logger.log(`<unsubscribeFromFilterData>`)
    this.clientFilterCallback = null;
  }

  // To support multiple open filters, we need a column here
  setFilterRange(lo, hi) {
    const message = {
      filterData: this.dataView.setRange({lo, hi}, true, DataTypes.FILTER_DATA)
    };

    if (this.clientFilterCallback){
      this.clientFilterCallback(message);
    } else {
      this.filterDataMessage = message;
    }
  }

}