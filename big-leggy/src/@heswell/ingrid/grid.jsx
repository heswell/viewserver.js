
// TODO calculate width, height if not specified
/*global requestAnimationFrame cancelAnimationFrame */
import React, { useRef, useState, useReducer, useEffect, useCallback } from 'react';
import cx from 'classnames';
import * as Action from './model/actions';
import { Motion, spring } from 'react-motion';
import modelReducer, { initModel } from './model/modelReducer';
import Header from './header/header';
import InlineFilter from './header/inlineFilter';
import { Viewport } from './core/viewport';
import { getScrollbarSize } from './utils/domUtils';
import { columnUtils } from '../data';
import GridContext from './grid-context';
import gridReducer from './grid-reducer';
import {useContextMenu} from './use-context-menu';

import { createLogger, logColor } from '../remote-data/constants';

import './grid.css';

const logger = createLogger('Grid', logColor.green)

const scrollbarSize = getScrollbarSize();

export default function Grid({
    dataView,
    columns,
    style,
    showHeaders = true,
    headerHeight = showHeaders ? 24 : 0,
    selected = [],
    showFilters = false,
    onScroll,
    // TODO capture these as callbackProps
    onSelectCell=() => {},
    onSingleSelect,
    onSelectionChange,
    onDoubleClick,
    //TODO be explicit, what can we have here - which of these make sense as grid props ?
    ...props
    // width
    // height
    // rowHeight
    // minColumnWidth
    // groupColumnWidth
    // sortBy
    // groupBy
    // range
    // groupState
    // filter
    // collapsedColumns
    // selectionModel
}) {


    const header = useRef(null);
    const inlineFilter = useRef(null);
    const scrollLeft = useRef(0);
    const overTheLine = useRef(0);

    const [state, setState] = useState({
        showFilters,
        showFilter: null
    });

    const handleScroll = params => {
        const { scrollLeft: pos = -1 } = params;
        if (pos !== -1) {
            if (scrollLeft.current !== pos) {
                scrollLeft.current = pos;
                if (header.current) {
                    header.current.scrollLeft(pos);
                }
                if (inlineFilter.current) {
                    inlineFilter.current.scrollLeft(pos);
                }
            }
        }
        onScroll && onScroll(params);
    }

    const handleSelectionChange = useCallback((idx, row, rangeSelect, keepExistingSelection) => {
       console.log(`Grid handleSelectionchange ${idx}`)
        dataView.select(idx, rangeSelect,keepExistingSelection);
       //   onSelectionChange()
      // if (selected.length === 1 && onSingleSelect) {
      //     onSingleSelect(selected[0], selectedItem);
      // }

    },[])

    // this reducer is a no=op - always returns same state
    // TODO why not use existing reducer ?
    const [, callbackPropsDispatch] = useReducer(gridReducer(
        handleScroll,
        handleSelectionChange,
        onSelectCell,
        onDoubleClick
    ), null);

    const [model, dispatch] = useReducer(modelReducer, {
        //TODO which props exactly does the model still use ?
        ...props,
        columns: columns.map(columnUtils.toKeyedColumn),
        columnMap: columnUtils.buildColumnMap(columns),
        scrollbarSize,
        headerHeight
    }, initModel);

    const showContextMenu = useContextMenu(model, state, setState, dispatch);

    const {
        height,
        width,
        _headingDepth,
        groupBy,
        groupState,
        sortBy,
        range,
        _overTheLine } = model;

    useEffect(() => {
        overTheLine.current = _overTheLine;
        logger.log(`<useEffect _overTheLine>`);
        // we want to keep dispatching scroll as long as the column is over the line
        const scroll = () => {
            if (overTheLine.current !== 0) {
                const type = overTheLine.current > 0 ? Action.SCROLL_RIGHT : Action.SCROLL_LEFT;
                const scrollDistance = type === Action.SCROLL_RIGHT ? 3 : -3;
                dispatch({ type, scrollDistance });
                requestAnimationFrame(scroll);
            }
        };
        scroll();

    }, [_overTheLine])

    useEffect(() => {
        if (sortBy !== undefined) {
            dataView.sort(sortBy);
        }
    }, [dataView, sortBy]);

    useEffect(() => {
        if (groupBy !== undefined) {
            dataView.group(groupBy);
        }
    }, [dataView, groupBy])

    useEffect(() => {
        if (groupState !== undefined) {
            dataView.setGroupState(groupState);
        }
    }, [dataView, groupState]);

    useEffect(() => {
        if (range !== undefined) {
            dataView.setRange(range.lo, range.hi);
        }
    }, [dataView, range]);

    const filterHeight = state.showFilters ? 24 : 0;
    const headingHeight = showHeaders ? headerHeight * _headingDepth : 0;
    const totalHeaderHeight = headingHeight + filterHeight;
    
    const handleFilterOpen = useCallback(column => {
        if (state.showFilter !== column.name) {
            // we could call dataView here to trigger build of filter data
            // this could be moved down to serverApi
            const { key, name } = column.isGroup ? column.columns[0] : column;

            dataView.getFilterData({
                key, name
            });

            setTimeout(() => {
                setState({
                    ...state,
                    showFilter: column.name
                });
            }, 50)
        }
    }, [dataView, state])

    const handleFilterClose = useCallback((/*column*/) => {
        setState(state => ({
            ...state,
            showFilter: null
        }));
        // I think we're doing this so that if same filter is opened again, dataView sends rows
        dataView.setFilterRange(0, 0);
    }, [dataView])

    const isEmpty = dataView.size <= 0;
    const emptyDisplay = (isEmpty && props.emptyDisplay) || null;
    const className = cx(
        'Grid',
        props.className,
        emptyDisplay ? 'empty' : '',
        isEmpty && props.showHeaderWhenEmpty === false ? 'no-header' : ''
    );

    return (
        // we can roll context menu into the context once more of the child components are functions
        <GridContext.Provider value={{dispatch, callbackPropsDispatch, showContextMenu}}>
            <div style={{ ...style, position: 'relative', height, width }} className={className}>
                {showHeaders && headerHeight !== 0 &&
                    <Header ref={header}
                        height={headingHeight}
                        dispatch={dispatch}
                        gridModel={model}
                        onHeaderClick={props.onHeaderClick}
                        colHeaderRenderer={props.colHeaderRenderer}
                    />}

                {state.showFilters &&
                    <InlineFilter ref={inlineFilter}
                        dispatch={dispatch}
                        dataView={dataView}
                        model={model}
                        onFilterOpen={handleFilterOpen}
                        onFilterClose={handleFilterClose}
                        showFilter={state.showFilter}
                        height={filterHeight}
                        style={{ position: 'absolute', top: headerHeight, height: filterHeight, width }} />}

                <Motion defaultStyle={{ top: headingHeight }} style={{ top: spring(totalHeaderHeight) }}>
                    {interpolatingStyle =>
                        <Viewport
                            dataView={dataView}
                            model={model}
                            style={interpolatingStyle}
                            height={height - totalHeaderHeight}
                        />}
                </Motion>
                {emptyDisplay}
            </div>
        </GridContext.Provider>
    );
}