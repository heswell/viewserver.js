import React from "react";
import { applyLayout } from "../src/layoutUtils";
import { DraggableLayout, Flexbox, Component, Stack, View } from "../index";
import LayoutReducer from "../src/layout-reducer";
import { Action } from "../src/layout-action";
import { followPath } from "../src/utils/pathUtils";
import { typeOf } from "../src/utils/typeOf";

describe("LayoutReducer", () => {
  it("applies splitter changes to children ", () => {
    const component = (
      <Flexbox style={{ flexDirection: "row", width: 200, height: 100 }}>
        <Component style={{ flex: 1 }} />
        <Component style={{ flex: 1 }} />
      </Flexbox>
    );
    const props = applyLayout("Flexbox", component.props);
    const {
      children: [c1, c2],
    } = LayoutReducer(props, {
      type: Action.SPLITTER_RESIZE,
      path: "0",
      sizes: [50, 150],
    });
    expect(c1.props.style).toEqual({
      flexBasis: 50,
      flexGrow: 1,
      flexShrink: 1,
      width: "auto",
    });
    expect(c2.props.style).toEqual({
      flexBasis: 150,
      flexGrow: 1,
      flexShrink: 1,
      width: "auto",
    });
  });

  it("updates active when stack switched ", () => {
    const component = (
      <Stack
        active={0}
        style={{ flexDirection: "row", width: 200, height: 100 }}
      >
        <Component style={{ flex: 1 }} />
        <Component style={{ flex: 1 }} />
      </Stack>
    );
    const props = applyLayout("Flexbox", component.props);
    const {
      children: [child1, child2],
    } = props;

    const {
      active,
      children: [c1, c2],
    } = LayoutReducer(props, {
      type: Action.SWITCH_TAB,
      path: "0",
      nextIdx: 1,
    });

    expect(active).toEqual(1);
    // Children should not be changed by this operation
    expect(c1 === child1).toEqual(true);
    expect(c2 === child2).toEqual(true);
  });

  describe("drag drop", () => {
    let layoutState;
    let draggable;

    beforeEach(() => {
      draggable = <Component key={12345} title="Draggable" />;

      /**
       This is our initial structure onto which we are going to drop our draggable

       DraggableLayout is the root "0"

        
      ┌┄┄┄┄─Flexbox 0.0┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
      ┊           ┌┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ Flexbox 0.0.1.0┈┈┈┈┈┈┈┈┈┈┐
      ┊   ┌───────┬────────────────────────┬──────────────────────────┐ ┊    ┐
      ┊   │ 0.0.0 │        0.0.1.0.0       │        0.0.0.1           │ ┊    ┊
      ┊   │       │                        │                          │ ┊    ┊
      ┊   │       │                        │                          │ ┊  Flexbox  0.0.1
      ┊   │       │                        │                          │ ┊    ┊
      ┊   │       │                        │                          │ ┊    ┊ 
      ┊   │       ├────────────────────────┴──────────────────────────│ ┘    ┊ 
      ┊   │       │        0.0.1.1                                    │      ┊ 
      ┊   │       │                                                   │      ┊ 
      ┊   │       │                                                   │      ┊ 
      ┊   │       │                                                   │      ┊ 
      ┊   │       │                                                   │      ┊ 
      └   └───────┴───────────────────────────────────────────────────┘      ┊
                                                                             ┊                                            
                  └┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┘
                
        
       */
      const elementTree = (
        <DraggableLayout>
          <Flexbox style={{ width: 800, height: 500, flexDirection: "row" }}>
            <View header resizeable title="Test 1" style={{ width: 150 }}>
              <Component
                style={{ height: "100%", backgroundColor: "yellow" }}
              />
            </View>
            <Flexbox style={{ flex: 1, flexDirection: "column" }} resizeable>
              <Flexbox
                style={{
                  flex: 2,
                  flexGrow: 1,
                  flexShrink: 1,
                  flexDirection: "row",
                }}
                resizeable
              >
                <View header resizeable title="Test 2" style={{ flex: 1 }}>
                  <Component
                    style={{ height: "100%", backgroundColor: "orange" }}
                  />
                </View>
                <View header resizeable title="Test 4" style={{ flex: 1 }}>
                  <Component
                    style={{ height: "100%", backgroundColor: "rebeccapurple" }}
                  />
                </View>
              </Flexbox>
              <View header resizeable title="Test 5" style={{ flex: 1 }}>
                <Component
                  style={{ height: "100%", backgroundColor: "blue" }}
                />
              </View>
            </Flexbox>
          </Flexbox>
        </DraggableLayout>
      );

      layoutState = applyLayout("DraggableLayout", elementTree.props);
    });

    it("creates a Tabbed Stack wrapper when dropped onto View Header", () => {
      const target = followPath(layoutState, "0.0.1.1");

      const state = LayoutReducer(
        { ...layoutState, drag: { draggable } },
        {
          type: Action.DRAG_DROP,
          dropTarget: {
            pos: { position: { Header: true } },
            component: target,
          },
        }
      );

      const {
        props: {
          children: [flexBox, stack],
        },
      } = followPath(state, "0.0.1");
      expect(typeOf(flexBox)).toEqual("Flexbox");
      expect(typeOf(stack)).toEqual("Stack");
      expect(stack.props.children.length).toEqual(2);
      expect(stack.props.active).toEqual(1);

      expect(stack.props.style).toEqual({
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        flexDirection: "column",
      });

      const {
        props: {
          children: [view, component],
        },
      } = stack;
      expect(view.props.path).toEqual("0.0.1.1.0");
      expect(view.props.title).toEqual("Test 5");
      expect(component.props.path).toEqual("0.0.1.1.1");
      expect(component.props.title).toEqual("Draggable");

      const expectedStyle = {
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        width: "auto",
        height: "auto",
      };
      expect(view.props.style).toEqual(expectedStyle);
      expect(component.props.style).toEqual(expectedStyle);
    });

    it("adds to parent Flexbox when dropped at boundary withTheGrain, respects drop size", () => {
      const target = followPath(layoutState, "0.0.1");
      const state = LayoutReducer(
        { ...layoutState, drag: { draggable } },
        {
          type: Action.DRAG_DROP,
          dropTarget: {
            pos: {
              position: { East: true, EastOrWest: true, SouthOrEast: true },
              width: 120,
            },
            component: target,
          },
          targetRect: { width: 639 },
        }
      );

      const {
        props: { children },
      } = followPath(state, "0.0");

      expect(children.length).toEqual(3);
      const [child1, child2, child3] = children;
      expect(child2.props.style.flexBasis).toEqual(508);
      expect(child3.props.style.flexBasis).toEqual(120);
    });

    it("resizes sibings when a flexchild is removed", () => {
      const target = followPath(layoutState, "0.0.1");
      // start by dropping at boundary to insert a third flex child (per test above)
      const state = LayoutReducer(
        { ...layoutState, drag: { draggable } },
        {
          type: Action.DRAG_DROP,
          dropTarget: {
            pos: {
              position: { East: true, EastOrWest: true, SouthOrEast: true },
              width: 120,
            },
            component: target,
          },
          targetRect: { width: 639 },
        }
      );

      // now remove the third child
      const finalState = LayoutReducer(
        { ...state, drag: { draggable } },
        {
          type: Action.REMOVE,
          path: "0.0.2",
        }
      );

      const {
        props: { children },
      } = followPath(finalState, "0.0");
      expect(children.length).toEqual(2);
      expect(children[0].props.style.width).toEqual(150);
      expect(children[1].props.style.flexGrow).toEqual(1);
    });

    it("correctly resets all paths when root re-wrapped", () => {
      const target = followPath(layoutState, "0.0");

      const state = LayoutReducer(
        { ...layoutState, drag: { draggable } },
        {
          type: Action.DRAG_DROP,
          dropTarget: {
            pos: { height: 120, position: { North: true } },
            component: target,
          },
        }
      );

      const wrapper = state.children[0];

      expect(typeOf(wrapper)).toEqual("Flexbox");
      expect(wrapper.props.style.flexDirection).toEqual("column");
      expect(wrapper.props.path).toEqual("0.0");
      expect(wrapper.props.children[0].props.path).toEqual("0.0.0");
      expect(wrapper.props.children[1].props.path).toEqual("0.0.1");

      expect(typeOf(wrapper.props.children[1])).toEqual("Flexbox");
      expect(wrapper.props.children[1].props.style.flexDirection).toEqual(
        "row"
      );

      const {
        props: {
          children: [child1, child2],
        },
      } = wrapper.props.children[1];
      expect(child1.props.path).toEqual("0.0.1.0");
      expect(child2.props.path).toEqual("0.0.1.1");

      expect(typeOf(child2)).toEqual("Flexbox");
      expect(child2.props.style.flexDirection).toEqual("column");
      const {
        props: {
          children: [child3, child4],
        },
      } = child2;
      expect(child3.props.path).toEqual("0.0.1.1.0");
      expect(child4.props.path).toEqual("0.0.1.1.1");
    });
  });
});