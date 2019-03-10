import React from 'react';
import {Grid, Selection} from '../../ingrid';
import {filter} from '../../data';

const {INCLUDE, EXCLUDE} = filter;

export default class CheckList extends React.Component {

    render(){
        return <Grid className='checkbox-list'
            debug_title={this.props.debug_title}
            showHeaders={false}
            rowHeight={22}
            minColumnWidth={80}
            columns={this.props.columns}
            selectionModel={Selection.Checkbox}
            selectionDefault={this.props.selectionDefault}
            defaultSelected={this.props.defaultSelected}
            height={this.props.height}
            width={this.props.width}
            style={this.props.style}
            dataView={this.props.dataView}
            onSelectionChange={this.props.onSelectionChange}

        />;
    }

    handleSelectionChange = (selectedIndices, idx) => {
        const deselected = selectedIndices.indexOf(idx) === -1;
        const filterMode = this.props.selectionDefault === true
            ? EXCLUDE
            : INCLUDE;
            
        const {meta} = this.props.dataView;

        const value = this.props.dataView.itemAtIdx(idx)[meta.KEY];
        const selectedValues = deselected
            ? this.state.selectedValues.filter(v => v !== value)
            : this.state.selectedValues.concat(value);
        this.setState({selectedValues}, () => {
            this.props.onSelectionChange(selectedValues, filterMode);
        });
    }

}
