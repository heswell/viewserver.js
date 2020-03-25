import React, {useCallback, useContext} from 'react';
import cx from 'classnames';

import * as Action from '../model/actions';
import Cell from '../cells/cell.jsx';
import GridContext from '../grid-context';
import GroupCell from '../cells/group-cell.jsx';

import './row.css';

export default React.memo(function Row({
    row,
    idx,
    columns,
    gridModel
}){

    const {meta, rowHeight} = gridModel;
    const handleContextMenu = useCallback(e => showContextMenu(e, 'row', {idx, row}),[idx, row]);
    const {dispatch, callbackPropsDispatch, showContextMenu} = useContext(GridContext);

    const handleClick = useCallback(e => {
        const rangeSelect = e.shiftKey;
        const keepExistingSelection = e.ctrlKey || e.metaKey /* mac only */;
        console.log(`Row about to call callbackPropsDIspatch('selection')`);
        callbackPropsDispatch({type:'selection', idx, row, rangeSelect, keepExistingSelection})
    },[idx, row])

    const handleDoubleClick = useCallback(() => callbackPropsDispatch({type: 'double-click', idx, row}),[idx, row]);

    const onClick = useCallback(cellIdx => {
        if (isGroup){
            dispatch({ type: Action.TOGGLE, groupRow: row });
        }
        callbackPropsDispatch({type: 'select-cell', idx, cellIdx})
    },[idx, row])

    const groupLevel = row[meta.DEPTH];
    const isGroup = groupLevel !== 0;
    const isSelected = row[meta.SELECTED] === 1;
    // TODO should be driven by config
    const striping = idx % 2 === 0 ? 'even' : 'odd';

    const className = cx(
        'GridRow', striping, {
            selected: isSelected,
            group: isGroup,
            collapsed: isGroup && groupLevel < 0,
            expanded : isGroup && groupLevel >= 0
        }
    );

    const cells = columns.filter(column => !column.hidden).map((column,idx) => 
        column.isGroup
            ? <GroupCell key={idx} idx={idx} column={column} meta={meta} row={row} onClick={onClick} />
            : <Cell key={column.key} idx={idx} column={column} meta={meta} row={row} onClick={onClick} />
    );

    return (
        <div className={className}
            tabIndex={0}
            style={{transform: `translate3d(0px, ${idx*rowHeight}px, 0px)`}}
            onClick={handleClick} 
            onDoubleClick={handleDoubleClick} 
            onContextMenu={handleContextMenu}>
            {cells}
        </div>
    );
})
 
