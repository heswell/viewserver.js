import React from 'react';
import { Component, TabbedContainer } from '@heswell/layout';

export default (width = 500, height = 400) =>
    <TabbedContainer style={{width: 800, height: 500}} active={0} resizeable>
      <Component title='Rebecca' style={{backgroundColor: 'rebeccapurple'}} header/>
      <Component title='Red' style={{backgroundColor: 'red'}} header/>
      <Component title='Alice' style={{backgroundColor: 'aliceblue'}} header/>
      <Component title='Cornflower' style={{backgroundColor: 'cornflowerblue'}} header/>
    </TabbedContainer>