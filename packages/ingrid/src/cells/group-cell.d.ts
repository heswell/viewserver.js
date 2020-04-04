import {Column} from '../model/model';

export interface GroupCellProps {
  idx: number;
  column: Column;
  meta: any;
  row: any;
  onClick?: (columnIndex: number) => void;
}

export type GroupCellComponent = React.ComponentType<GroupCellProps>;;
declare const GroupCell: GroupCellComponent;
export default GroupCell;