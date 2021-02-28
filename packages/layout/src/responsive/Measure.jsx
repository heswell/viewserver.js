// TODO deal with percentage values
import React, { useLayoutEffect, useRef, useState } from "react";

const size = (value) =>
  value === null || value === undefined || value === "auto" ? "100%" : value;

export const useMeasure = (props) => {
  return useState({
    assignedHeight: size(props.style?.height ?? props.height),
    height: assignedHeight,
    assignedWidth: size(props.style?.width ?? props.width),
    width: assignedWidth
  });
};

// TODO need to listen for resize events if size is auto in any direction
export const Measure = ({ height, width, onMeasure }) => {
  const el = useRef(null);
  const [{ h, w }, setSize] = useState({ h: height, w: width });
  useLayoutEffect(() => {
    const {
      height: measuredHeight,
      width: measuredWidth
    } = el.current.getBoundingClientRect();
    if (measuredHeight === 0) {
      const bodyHeight = document.body.clientHeight;
      setSize({ h: `calc(100vh - ${bodyHeight}px)`, w });
    } else {
      onMeasure({ height: measuredHeight, width: measuredWidth });
    }
  }, [h, w, onMeasure]);
  return (
    <div ref={el} style={{ width: w, height: h, backgroundColor: "yellow" }} />
  );
};

