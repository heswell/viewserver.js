import React from 'react';
import {Column, GridModel} from '../model/model';

export interface RowProps {
  idx: number;
  columns: Column[];
  gridModel: GridModel;
  row: any;
  keys: Map<number,number>;
}

export declare const PADDING_CELL: 'padding-cell';

export type RowComponent = React.ComponentType<RowProps>;
declare const Row: RowComponent;
export default Row;