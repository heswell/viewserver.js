import React from "react";
import { uuid } from "@heswell/utils";
import { expandFlex, getProps, typeOf } from "./utils";
import {
  ComponentRegistry,
  isContainer,
  isView,
} from "./registry/ComponentRegistry";

export const getManagedDimension = (style) =>
  style.flexDirection === "column" ? ["height", "width"] : ["width", "height"];

const theKidHasNoStyle = {};

export const applyLayoutProps = (component, dispatch) => {
  const [layoutProps, children] = getChildLayoutProps(
    typeOf(component),
    component.props,
    dispatch,
    `0`
  );
  return React.cloneElement(component, layoutProps, children);
};

export const applyLayout = (type, props, dispatch, previousLayout) => {
  if (props.layout) {
    return layoutFromJson(props.layout, dispatch, "0");
  } else {
    const [layoutProps, children] = getChildLayoutProps(
      type,
      props,
      dispatch,
      "0",
      undefined,
      previousLayout
    );
    return {
      ...props,
      ...layoutProps,
      type,
      children,
    };
  }
};

function getLayoutProps(
  type,
  props,
  dispatch,
  path = "0",
  parentType = null,
  previousLayout
) {
  const isNativeElement = type[0].match(/[a-z]/);
  const { layoutId, path: prevPath, id: prevId = layoutId } = getProps(
    previousLayout
  );
  // console.log(
  //   `getLayoutProps "${path}" ${type} ["${prevPath}" ${typeOf(
  //     previousLayout
  //   )} ${prevId}]`
  // );
  const prevMatch = typeOf(previousLayout) === type && path === prevPath;
  // TODO is there anything else we can re-use from previousType ?
  const id = prevMatch ? prevId : uuid();
  const key = id;
  const style = getStyle(type, props, parentType);
  return isNativeElement
    ? { id, key, style }
    : { layoutId: id, key, dispatch, path, style, type };
}

function getChildLayoutProps(
  type,
  props,
  dispatch,
  path,
  parentType,
  previousLayout
) {
  const layoutProps = getLayoutProps(
    type,
    props,
    dispatch,
    path,
    parentType,
    previousLayout
  );
  const children = getLayoutChildren(
    type,
    props.children,
    dispatch,
    path,
    previousLayout?.children ?? previousLayout?.props?.children
  );
  return [layoutProps, children];
}

function getLayoutChildren(
  type,
  children,
  dispatch,
  path = "0",
  previousChildren
) {
  return isContainer(type) || isView(type)
    ? React.Children.map(children, (child, i) => {
        const [layoutProps, children] = getChildLayoutProps(
          typeOf(child),
          child.props,
          dispatch,
          `${path}.${i}`,
          type,
          previousChildren?.[i]
        );
        return React.cloneElement(child, layoutProps, children);
      })
    : children;
}

const getStyle = (type, props, parentType) => {
  let { style = theKidHasNoStyle } = props;
  if (type === "Flexbox") {
    style = {
      flexDirection: props.column ? "column" : "row",
      ...style,
      display: "flex",
    };
  }

  if (style.flex) {
    const { flex, ...otherStyles } = style;
    style = {
      ...otherStyles,
      ...expandFlex(flex),
    };
  } else if (parentType === "Stack") {
    style = {
      ...style,
      ...expandFlex(1),
    };
  }

  return style;
};

function layoutFromJson({ type, children, props }, dispatch, path) {
  if (type === "DraggableLayout") {
    return layoutFromJson(children[0], dispatch, "0");
  }

  const componentType = type.match(/^[a-z]/) ? type : ComponentRegistry[type];

  if (componentType === undefined) {
    throw Error(`Unable to create component from JSON, unknown type ${type}`);
  }
  const id = uuid();
  return React.createElement(
    componentType,
    {
      ...props,
      dispatch,
      id,
      key: id,
      path,
    },
    children
      ? children.map((child, i) =>
          layoutFromJson(child, dispatch, `${path}.${i}`)
        )
      : undefined
  );
}

export function layoutToJSON(type, props, component) {
  const start = performance.now();
  const result = componentToJson(component);
  const end = performance.now();
  console.log(`toJSON took ${end - start}ms`);

  if (type === "DraggableLayout") {
    return {
      type,
      children: [result],
    };
  }

  return result;
}

export function componentToJson(component) {
  const {
    type,
    props: { children, ...props },
  } = component;
  return {
    type: serializeType(type),
    props: serializeProps(props),
    children: React.Children.map(children, componentToJson),
  };
}

function serializeType(elementType) {
  if (typeof elementType === "function" || typeof elementType === "object") {
    return (
      elementType.displayName || elementType.name || elementType?.type.name
    );
  } else if (typeof elementType === "string") {
    return elementType;
  }
}

export function serializeProps(props) {
  if (props) {
    // Question, will there ever be a requirement to preserve id value ?
    const { id, path, ...otherProps } = props;
    const result = {};
    for (let [key, value] of Object.entries(otherProps)) {
      if (typeof value === "object") {
        result[key] = serializeProps(value);
      } else if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        result[key] = value;
      }
    }
    return result;
  }
}