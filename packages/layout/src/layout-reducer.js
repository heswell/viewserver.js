import React from "react";
import { uuid } from "@heswell/utils";
import { Action } from "./layout-action";
import {
  containerOf,
  followPath,
  followPathToParent,
  getProps,
  nextStep,
  resetPath,
  typeOf,
} from "./utils";
import { getManagedDimension } from "./layoutUtils";
import { ComponentRegistry, isContainer } from "./registry/ComponentRegistry";

const MISSING_TYPE = undefined;

const MISSING_HANDLER = (state, action) => {
  console.warn(
    `layoutActionHandlers. No handler for action.type ${action.type}`
  );
  return state;
};

const MISSING_TYPE_HANDLER = (state) => {
  console.warn(
    `layoutActionHandlers. Invalid action:  missing attribute 'type'`
  );
  return state;
};

const handlers = {
  [Action.DRAG_STARTED]: dragStart,
  [Action.DRAG_DROP]: dragDrop,
  [Action.SPLITTER_RESIZE]: splitterResize,
  [Action.REMOVE]: removeChild,
  [Action.SWITCH_TAB]: switchTab,
  [MISSING_TYPE]: MISSING_TYPE_HANDLER,
};

export default (state, action) => {
  return (handlers[action.type] || MISSING_HANDLER)(state, action);
};

function switchTab(state, { path, nextIdx }) {
  var target = followPath(state, path);
  let replacement;
  if (React.isValidElement(target)) {
    replacement = React.cloneElement(target, { active: nextIdx });
  } else {
    replacement = {
      ...target,
      active: nextIdx,
    };
  }
  return swapChild(state, target, replacement);
}

function splitterResize(rootProps, { path, sizes }) {
  const target = followPath(rootProps, path);
  const targetIsRoot = target === rootProps;
  const { children, style } = targetIsRoot ? target : target.props;

  const replacementChildren = children.map((child, i) => {
    const dim = style.flexDirection === "column" ? "height" : "width";
    const {
      style: { [dim]: size, flexBasis },
    } = child.props;
    if (size === sizes[i] || flexBasis === sizes[i]) {
      return child;
    } else {
      return React.cloneElement(child, {
        style: applySize(child.props.style, dim, sizes[i]),
      });
    }
  });

  const replacement = targetIsRoot
    ? { ...target, children: replacementChildren }
    : React.cloneElement(target, null, replacementChildren);

  return swapChild(rootProps, target, replacement);
}

/**
 *  We will be passed a component to drag (with instructions)
 * OR a path, which indicates that a component within the layout
 * is to be extracted and dragged to a new position.
 */
function dragStart(
  rootProps,
  { component, dragRect, dragPos, instructions, path }
) {
  // if (React.isValidElement(state)) {
  var draggable = component || followPath(rootProps, path);

  const newRootProps = {
    drag: { dragRect, dragPos, dragPath: path, draggable },
    ...rootProps,
  };

  if (instructions && instructions.DoNotRemove) {
    return newRootProps;
  } else {
    return _removeChild(newRootProps, draggable);
  }
  // } else {
  //   console.log(`layout-reducer: dragStart, expected React element`);
  // }
}

function dragDrop({ drag: { draggable: source }, ...rootProps }, action) {
  const {
    dropTarget: { component: target, pos },
    targetRect,
    targetPosition,
  } = action;

  if (pos.position.Header) {
    if (typeOf(target) === "Stack") {
      let before, after;
      const tabIndex = pos.tab.index;
      if (pos.tab.index === -1 || tabIndex >= target.props.children.length) {
        ({
          props: { path: after },
        } = target.props.children[target.props.children.length - 1]);
      } else {
        ({
          props: { path: before },
        } = target.props.children[tabIndex]);
      }
      return insert(rootProps, source, null, before, after);
    } else {
      return wrap(rootProps, source, target, pos);
    }
  } else if (pos.position.Centre) {
    return replaceChild(rootProps, target, source);
  } else {
    return dropLayoutIntoContainer(
      rootProps,
      pos,
      source,
      target,
      targetPosition,
      targetRect
    );
  }
}

function applySize(style, dim, newSize) {
  const hasSize = typeof style[dim] === "number";
  const { flexShrink = 1, flexGrow = 1 } = style;
  return {
    ...style,
    [dim]: hasSize ? newSize : "auto",
    flexBasis: hasSize ? "auto" : newSize,
    flexShrink,
    flexGrow,
  };
}

function replaceChild(model, child, replacement) {
  const { path, style } = child.props;
  const newChild = React.cloneElement(replacement, {
    path,
    style: {
      ...style,
      ...replacement.props.style,
    },
  });

  return swapChild(model, child, newChild);
}

function swapChild(model, child, replacement) {
  if (model === child) {
    return replacement;
  } else {
    if (React.isValidElement(model)) {
      const { idx, finalStep } = nextStep(model.props.path, child.props.path);
      const children = model.props.children.slice();
      if (finalStep) {
        children[idx] = replacement;
      } else {
        children[idx] = swapChild(children[idx], child, replacement);
      }
      return React.cloneElement(model, null, children);
    } else {
      const { idx, finalStep } = nextStep(model.path, child.props.path);
      const children = model.children.slice();
      if (finalStep) {
        children[idx] = replacement;
      } else {
        children[idx] = swapChild(children[idx], child, replacement);
      }
      return { ...model, children };
    }
  }
}

function isFlexible(model) {
  return model.props.style.flexGrow > 0;
}

function canBeMadeFlexible(model) {
  const { width, height, flexGrow } = model.props.style;
  return (
    flexGrow === 0 && typeof width !== "number" && typeof height !== "number"
  );
}

function makeFlexible(children) {
  return children.map((child) =>
    canBeMadeFlexible(child)
      ? React.cloneElement(child, {
          style: {
            ...child.props.style,
            flexGrow: 1,
          },
        })
      : child
  );
}

function removeChild(rootProps, { path }) {
  var target = followPath(rootProps, path);
  return _removeChild(rootProps, target);
}

function _removeChild(model, child) {
  let { active, children: componentChildren, path } = getProps(model);
  const { idx, finalStep } = nextStep(path, child.props.path);
  const type = typeOf(model);
  let children = componentChildren.slice();
  if (finalStep) {
    children.splice(idx, 1);
    if (active !== undefined && active >= idx) {
      active = Math.max(0, active - 1);
    }

    if (children.length === 1 && type.match(/Flexbox|Stack/)) {
      return unwrap(model, children[0]);
    }

    // Not 100% sure we should do this, unless configured to
    if (!children.some(isFlexible) && children.some(canBeMadeFlexible)) {
      children = makeFlexible(children);
    }
  } else {
    children[idx] = _removeChild(children[idx], child);
  }

  children = children.map((child, i) => resetPath(child, `${path}.${i}`));
  return React.isValidElement(model)
    ? React.cloneElement(model, { active }, children)
    : { ...model, active, children };
}

function unwrap(state, child) {
  const type = typeOf(state);
  const {
    path,
    drag,
    style: { flexBasis, flexGrow, flexShrink, width, height },
  } = state.props;

  let unwrappedChild = resetPath(child, path);
  if (path === "0.0") {
    unwrappedChild = React.cloneElement(unwrappedChild, {
      drag,
      style: {
        ...child.props.style,
        width,
        height,
      },
    });
  } else if (type === "Flexbox") {
    const dim =
      state.props.style.flexDirection === "column" ? "height" : "width";
    const {
      style: { [dim]: size, ...style },
    } = unwrappedChild.props;
    // Need to overwrite key
    unwrappedChild = React.cloneElement(unwrappedChild, {
      // Need to assign key
      drag,
      style: {
        ...style,
        flexGrow,
        flexShrink,
        flexBasis,
      },
    });
  }
  return unwrappedChild;
}

function dropLayoutIntoContainer(
  rootProps,
  pos,
  source,
  target,
  targetPosition,
  targetRect
) {
  // In a Draggable layout, 0.n is the top-level layout
  if (target.path === "0.0" || target.props.path === "0.0") {
    return wrap(rootProps, source, target, pos);
  } else {
    var targetContainer = followPathToParent(rootProps, target.props.path);

    if (absoluteDrop(target, pos.position)) {
      return insert(
        rootProps,
        source,
        target.props.path,
        null,
        null,
        pos.width || pos.height
      );
    } else if (target === rootProps || isDraggableRoot(rootProps, target)) {
      // Can only be against the grain...
      if (withTheGrain(pos, target)) {
        throw Error("How the hell did we do this");
      } else {
        //onsole.log('CASE 4A) Works');
        //return transform(layout, { wrap: {target, source, pos }, releaseSpace});
      }
    } else if (withTheGrain(pos, targetContainer)) {
      if (pos.position.SouthOrEast) {
        return insert(
          rootProps,
          source,
          null,
          null,
          target.props.path,
          pos.width || pos.height,
          targetRect
        );
      } else {
        return insert(
          rootProps,
          source,
          null,
          target.props.path,
          null,
          pos.width || pos.height,
          targetRect
        );
      }
    } else if (!withTheGrain(pos, targetContainer)) {
      return wrap(rootProps, source, target, pos, targetRect);
    } else if (isContainer(targetContainer)) {
      return wrap(rootProps, source, target, pos, targetRect);
    } else {
      console.log("no support right now for position = " + pos.position);
    }
  }

  return rootProps;
}

function wrap(model, source, target, pos, targetRect) {
  const { path: modelPath, children: modelChildren } = getProps(model);

  const { path } = target.props;
  const { idx, finalStep } = nextStep(modelPath, path);
  const children = modelChildren.slice();

  if (finalStep) {
    const { type, flexDirection } = getLayoutSpec(pos);
    const active = type === "Stack" || pos.position.SouthOrEast ? 1 : 0;
    target = children[idx];

    const size = pos.width || pos.height;

    const style = {
      ...target.props.style,
      flexDirection,
    };

    // This assumes flexBox ...
    const flexStyles = {
      flexBasis: 0,
      flexGrow: 1,
      flexShrink: 1,
      width: "auto",
      height: "auto",
    };

    const sourceStyle = size
      ? {
          ...flexStyles,
          flexBasis: size,
          flexShrink: 0,
          flexGrow: 0,
        }
      : flexStyles;

    const targetFirst = pos.position.SouthOrEast || pos.position.Header;
    const nestedSource = React.cloneElement(source, {
      resizeable: true,
      style: {
        ...source.props.style,
        ...sourceStyle,
      },
    });
    const nestedTarget = React.cloneElement(target, {
      resizeable: true, // how do we decide this ?
      style: {
        ...target.props.style,
        ...flexStyles,
      },
    });

    const id = uuid();
    var wrapper = React.createElement(
      ComponentRegistry[type],
      {
        active,
        dispatch: target.props.dispatch,
        layoutId: id,
        key: id,
        path: target.props.path,
        // TODO we should be able to configure this in setDefaultLayoutProps
        splitterSize:
          type === "Flexbox" && typeOf(model) === "Flexbox"
            ? model.props.splitterSize
            : undefined,
        style,
        resizeable: target.props.resizeable,
      },
      targetFirst
        ? [
            resetPath(nestedTarget, `${path}.0`),
            resetPath(nestedSource, `${path}.1`),
          ]
        : [
            resetPath(nestedSource, `${path}.0`),
            resetPath(nestedTarget, `${path}.1`),
          ]
    );

    children.splice(idx, 1, wrapper);
  } else {
    children[idx] = wrap(children[idx], source, target, pos, targetRect);
  }
  return React.isValidElement(model)
    ? React.cloneElement(model, null, children)
    : {
        ...model,
        children,
      };
}

function insert(component, source, into, before, after, size, targetRect) {
  let isElement = React.isValidElement(component);
  const {
    active: componentActive,
    path,
    children: componentChildren,
  } = isElement ? component.props : component;
  const type = typeOf(component);
  const target = before || after || into;

  let { idx, finalStep } = nextStep(path, target);
  let children;
  let active;

  // One more step needed when we're inserting 'into' a container
  var oneMoreStepNeeded = finalStep && into && idx !== -1;

  if (finalStep && !oneMoreStepNeeded) {
    const isFlexBox = type === "Flexbox";
    const [dim] = getManagedDimension(component.props.style);
    //TODO how do we identify splitter width
    //TODO checj reiizeable to make sure a splitter will be present
    function assignSizes(rect, dim, size) {
      if (typeof size === "number") {
        return [size, rect[dim] - size - 11];
      } else {
        const measurement = (targetRect[dim] - 11) / 2;
        return [measurement, measurement];
      }
    }

    children = componentChildren.reduce((arr, child, i) => {
      if (idx === i) {
        if (isFlexBox) {
          const [sourceMeasurement, childMeasurement] = assignSizes(
            targetRect,
            dim,
            size
          );
          // TODO if size is supplied, it must be respected
          source = assignFlexDimension(source, dim, sourceMeasurement);
          child = assignFlexDimension(child, dim, childMeasurement);
        } else {
          const {
            style: {
              left: _1,
              top: _2,
              flex: _3,
              width,
              height,
              transform: _4,
              transformOrigin: _5,
              ...style
            },
          } = source.props;
          const dimensions = source.props.resizeable ? {} : { width, height };
          source = React.cloneElement(source, {
            style: { ...style, ...dimensions },
          });
        }
        if (before) {
          arr.push(source, child);
        } else {
          arr.push(child, source);
        }
      } else {
        // arr.push(assignFlexDimension(child, dim, measurement));
        arr.push(child);
      }
      return arr;
    }, []);

    const insertedIdx = children.indexOf(source);
    active = type === "Stack" ? insertedIdx : componentActive;

    children = children.map((child, i) =>
      i < insertedIdx ? child : resetPath(child, `${path}.${i}`)
    );
  } else {
    children = componentChildren.slice();
    children[idx] = insert(
      children[idx],
      source,
      into,
      before,
      after,
      size,
      targetRect
    );
  }

  return isElement
    ? React.cloneElement(component, { ...component.props, active }, children)
    : {
        ...component,
        active,
        children,
      };

  return;
}

function assignFlexDimension(model, dim, size = 0) {
  const {
    style: { flex, flexBasis, height, width, ...otherStyles } = {},
  } = model.props;
  const { [dim]: currentSize } = { height, width };

  if ((flexBasis === "auto" && currentSize === size) || flexBasis === size) {
    return model;
  }

  const style = {
    ...otherStyles,
    [dim]: "auto",
    flexBasis: size,
    flexGrow: 0,
    flexShrink: 0,
  };

  return React.cloneElement(model, {
    style,
  });
}

// TODO do we still need surface
function absoluteDrop(target, position) {
  return typeOf(target) === "Surface" && position.Absolute;
}

//TODO how are we going to allow dgar containers to be defined ?
function isDraggableRoot(layout, component) {
  if (component.props.path === "0") {
    return true;
  }

  var container = containerOf(layout, component);
  if (container) {
    return typeOf(container) === "App";
  } else {
    debugger;
  }
}

// Note: withTheGrain is not the negative of againstTheGrain - the difference lies in the
// handling of non-Flexible containers, the response for which is always false;
function withTheGrain(pos, container) {
  return pos.position.NorthOrSouth
    ? isTower(container)
    : pos.position.EastOrWest
    ? isTerrace(container)
    : false;
}

function isTower(model) {
  return (
    typeOf(model) === "Flexbox" && model.props.style.flexDirection === "column"
  );
}

function isTerrace(model) {
  return (
    typeOf(model) === "Flexbox" && model.props.style.flexDirection !== "column"
  );
}

// maybe in layout-json ?
function getLayoutSpec(pos) {
  var type, flexDirection;

  if (pos.position.Header) {
    type = "Stack";
    flexDirection = "column";
  } else {
    type = "Flexbox";
    if (pos.position.EastOrWest) {
      flexDirection = "row";
    } else {
      flexDirection = "column";
    }
  }

  return { type, flexDirection };
}