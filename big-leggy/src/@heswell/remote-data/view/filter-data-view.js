import {DataTypes} from '../../data/store/types';
import {metaData} from '../../data/store/columnUtils';
import BaseDataView from './base-data-view';
import {
  createLogger, logColor
} from '../constants';

const logger = createLogger('FilterDataView', logColor.brown);

export default class FilterDataView extends BaseDataView {

  constructor(dataView, column){
        super();
        this.dataView = dataView;
        this.column = column;
        this.dataCountCallback = null;
    }

    subscribe({columns, range}, callback){
        logger.log(`FilterView subscribe to ${JSON.stringify(columns)}`)

        this.columns = columns;
        this.meta = metaData(columns);
        //TODO make range s setter
        this.range = range;
        this.keyCount = range.hi - range.lo;

        this.dataView.subscribeToFilterData(this.column, this.range, message => {

            const {filterData} = message;
            const {rows, size, range, dataCounts} = filterData;

            console.log(`receive rows ${rows.length} of ${size} range ${JSON.stringify(range)}`, message)

            const mergedRows = this.processData(rows, size, 0)

            callback(mergedRows, size);

            if (this.dataCountCallback){
                this.dataCountCallback(dataCounts);
            }    
  
        })
    }

    subscribeToDataCounts(callback){
        this.dataCountCallback = callback;
    }

    unsubscribe(){
        this.dataView.unsubscribeFromFilterData();
    }

    destroy(){
        logger.log(`<destroy>`)
        this.dataView.unsubscribeFromFilterData(this.column);
    }

    onFilterData = (_, rows, rowCount, totalCount, dataCounts) => {
        this.emit(DataTypes.ROW_DATA, rows, rowCount, totalCount, dataCounts);
    }


    filter(filter){
        this.dataView.filter(filter, DataTypes.FILTER_DATA);
    }

    // TODO we need a filter method to filter results to omit zero value filterCount - call getFilterData on view, passing filter

    setRange(lo, hi){
      this.range = { lo, hi };
      logger.log(`setRange ${lo} ${hi}`)
      this.dataView.setFilterRange(lo,hi);
    }

    itemAtIdx(idx){
        const {IDX} = this.meta;
        return this.dataRows.find(r => r[IDX] === idx);
    }

    indexOf(value){
        const {IDX, KEY} = this.meta;
        const item = this.dataRows.find(r => r[KEY] === value);
        return item ? item[IDX] : -1;
    }

    sort(){
        
    }
  
}

