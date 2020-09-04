// @ts-nocheck
import React from 'react';
import cx from 'classnames';
import {metadataKeys} from '@heswell/utils'
import useGridStyles from '../use-styles';
import useStyles from './checkbox-style';
  
const CheckboxCell = function CheckboxCell({column, row}){

    const {GridCell} = useGridStyles();
    const classes = useStyles();

    const className = cx(GridCell, classes.Checkbox,{
        checked: row[metadataKeys.SELECTED] === 1,
        emptyRow: row[metadataKeys.KEY] === undefined
    });
    return (
        <div className={className} style={{ width: column.width }} tabIndex={0} />
    );
}

export default CheckboxCell;