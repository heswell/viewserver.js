import {createLogger, logColor} from '@heswell/utils'
import DataView from '../store/data-view';
import { metaData } from '../store/columnUtils';
import { DataTypes } from '../store/types';
import Table from '../store/table';
import LocalUpdateQueue from '../store/local-update-queue';

const buildDataView = async url => {
  console.log(`import url ${url}`)
  return import(/* webpackIgnore: true */ url)
    .catch(err => console.log(`failed to load data at ${url} ${err}`))
}

const logger = createLogger('LocalDataView', logColor.blue);

export default class LocalDataView {
  constructor({
    url,
    tableName
  }) {

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

    this.pendingRangeRequest = null;
    this.pendingFilterDataRequest = null;
    this.pendingFilterRangeRequest = null;
  }

  async subscribe({
    tableName = this.tableName,
    columns
    // TODO support groupBy, sort etc
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

    this.updateQueue.on(DataTypes.ROW_DATA, (evtName, rows, size, range, offset) => callback({rows, size, range, offset}));

    //TODO can we eliminate all the following ?
    if (this.pendingRangeRequest){
      this.setRange(...this.pendingRangeRequest);
      this.pendingRangeRequest = null;
    }
    if (this.pendingFilterDataRequest){
      this.getFilterData(...this.pendingFilterDataRequest);
      this.pendingFilterDataRequest = null;
    }

    if (this.pendingFilterRangeRequest){
      this.setFilterRange(...this.pendingFilterRangeRequest);
      this.pendingFilterRangeRequest = null;
    }
  }

  unsubscribe() {

  }

  setRange(lo, hi) {
    if (this.dataView === null){
      this.pendingRangeRequest = [lo,hi]
    } else {
      this.clientCallback(this.dataView.setRange({lo, hi}, true, DataTypes.ROW_DATA));
    }
  }

  select(idx, rangeSelect, keepExistingSelection) {
    this.clientCallback(this.dataView.select(idx, rangeSelect, keepExistingSelection))
  }

  selectAll(dataType){
    this.clientCallback(this.dataView.selectAll(dataType));
  }

  selectNone(dataType){
    this.clientCallback(this.dataView.selectNone(dataType));
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
    // TODO can we eliminate the filterData callback ?
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
    if (this.dataView){
      const filterData =  this.dataView.getFilterData(column, searchText)
      if (this.clientFilterCallback){
        this.clientFilterCallback({filterData});
      } else {
        this.filterDataMessage = {filterData};
      }
    } else {
      this.pendingFilterDataRequest = [column, searchText]
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
    if (this.dataView){
      const message = {
        filterData: this.dataView.setRange({lo, hi}, true, DataTypes.FILTER_DATA)
      };
  
      if (this.clientFilterCallback){
        this.clientFilterCallback(message);
      } else {
        this.filterDataMessage = message;
      }
 
    } else {
      this.pendingFilterRangeRequest = [lo, hi];
    }
  }

}