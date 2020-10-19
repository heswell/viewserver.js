import React, { useEffect, useRef } from 'react';
import cx from 'classnames';
import LayoutItem from './layout-item';
import useLayout from './use-layout';
import ComponentHeader from '../component/component-header.jsx';
import { registerType, isLayout, typeOf } from '../component-registry';
import { componentFromLayout } from '../util/component-from-layout-json';
// import { LayoutRoot } from './layout-root';
import {DragContainer} from '../drag-drop/draggable.js';


const PureSurface = React.memo(Surface);
PureSurface.displayName = 'Surface';

export default function Surface(props){
    const [layoutModel, dispatch] = useLayout({ layoutType: "FlexBox", props }/*, inheritedLayout*/);

    useEffect(() => {
        if (props.dragContainer){
            DragContainer.register(layoutModel.$path);
        }
    },[]);

    // onsole.log(`%cFlexBox render ${layoutModel.$path}`,'color: blue; font-weight: bold;')
    // console.log(`%cmodel = ${JSON.stringify(model,null,2)}`,'color: blue; font-weight: bold;')

    
    if (layoutModel === null){
        return null;
    } else {
        var { type, title, header, computedStyle } = layoutModel;
        const className = cx(type);
    
        return (
            <div className={className} style={computedStyle}>
                {header &&
                    <ComponentHeader
                        title={`${title}`}
                        onMouseDown={e => this.handleMouseDown(e)}
                        style={header.style}
                        menu={header.menu} />
                }
                {renderChildren()}
            </div>
        );
    
    }

    function renderChildren(){

        const { children: layoutChildren } = layoutModel;

        const propChildren = Array.isArray(props.children)
            ? props.children.filter(child => child)
            : [props.children];

        const results = [];

        for (var idx = 0, childIdx = 0; idx < layoutChildren.length; idx++) {

            var childLayoutModel = layoutChildren[idx];

            const child = typeOf(propChildren[childIdx]) === childLayoutModel.type
                ? propChildren[childIdx]
                : componentFromLayout(childLayoutModel);

            const layoutProps = {
                key: childLayoutModel.$id,
                idx: childIdx,
                absIdx: idx,
                layoutModel: childLayoutModel,
                dispatch
            };

            if (isLayout(child)) {
                results.push(React.cloneElement(child, { ...layoutProps }));
            } else {
                const {style, ...childProps} = child.props;
                results.push(<LayoutItem {...childProps} {...layoutProps}>{child}</LayoutItem>);
            }
            childIdx += 1;
        }
        return results;
    }
}

// needs to be registerComponent
registerType('Surface', Surface, true);