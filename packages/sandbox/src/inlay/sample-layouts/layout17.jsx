import React, { useState } from 'react';
import { Application, FlexBox,  PlaceHolder, DynamicContainer, handleLayout, registerClass } from '@heswell/inlay';
import {LayoutConfigurator,LayoutTreeViewer, ComponentPalette} from '@heswell/inlay-extras'
import {AppHeader} from '../app-header';

const NO_STYLES = {};

const CustomHeader = ({header, onLayout}) =>
    <AppHeader header={header} className="rect-component">
      <ComponentPalette onLayout={onLayout}/>
    </AppHeader>


registerClass("CustomHeader", CustomHeader);

export default ({width = 800, height = 1000}) => {

  const [state, setState] = useState({
    layoutModel: undefined,
    managedLayoutNode: null,
    selectedLayoutNode: null
  })

  const storeLayoutModel = layoutModel => {
		console.log(`storeLayoutModel`,layoutModel)
        const [{children: [,managedLayoutNode]}] = layoutModel.children;
        setState({
          layoutModel,
          selectedLayoutNode: managedLayoutNode,
          managedLayoutNode
        })
  }

  const handleChange = (feature, dimension, value, layoutStyle) => {
		const {selectedLayoutNode} = state;
		const layoutModel = handleLayout(state.layoutModel, 'replace', {
			targetNode: selectedLayoutNode,
			replacementNode: {
				...selectedLayoutNode,
				style: layoutStyle
			} 
		});
	  const [{children: [,managedLayoutNode]}] = layoutModel.children;
	  setState({
		  layoutModel,
      managedLayoutNode,
      selectedLayoutNode: null
	  });

  }

  const selectComponent = selectedLayoutNode => {
    setState({
      ...state,
      selectedLayoutNode
    })
  }

  const layoutStyle = state.selectedLayoutNode === null
  ? NO_STYLES
  : state.selectedLayoutNode.style;

  return (
    <Application width={width} height={height}
      layoutModel={state.layoutModel}
      onLayoutModel={storeLayoutModel}>
      <FlexBox style={{flexDirection:"column",width:"100%",height:'100%'}}>
        <CustomHeader style={{height:60}} />
        <DynamicContainer style={{flex:1}}>
          <PlaceHolder style={{width: '100%',height: '100%'}} resizeable/>
        </DynamicContainer>
        <FlexBox style={{flexDirection: 'row', height: 400}}>
          <LayoutTreeViewer style={{width: 400, height: 400}} 
                      tree={state.managedLayoutNode} onSelectNode={selectComponent}/>
                <LayoutConfigurator
                  style={{width: 400, height: 400}}
                  layoutStyle={layoutStyle}
                  onChange={handleChange}/>
        </FlexBox>
      </FlexBox>
    </Application>	
  )

}