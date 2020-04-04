export * from './src/data-source/data-source';
export {default as LocalDataSource} from './src/data-source/local-data-source';
export {default as FilterDataSource} from './src/data-source/filter-data-source';

export * from './src/store/types';

export declare const filter : {
  includesColumn: any;
  EQUALS: "EQ";
  GREATER_THAN: "GT";
  LESS_THAN: "LT";
  NOT_IN: "NOT_IN";
  STARTS_WITH: "SW";
}

export declare const columnUtils: {
  getFilterType: any;
}
