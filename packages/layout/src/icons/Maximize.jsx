import React, { useEffect, useRef } from "react";

import "./Icon.css";

const neverRerender = () => true;
const Icon = () => {
  const root = useRef(null);
  useEffect(() => {
    root.current.innerHTML = `
    <svg height="100%" viewBox="0 0 18 18" width="100%">
    <path class="icon-path" d="M7.0385,10.3535a.5.5,0,0,0-.707,0l-3.242,3.242L1.6,12.103A.344.344,0,0,0,1.3525,12a.35.35,0,0,0-.35.35v4.42a.25.25,0,0,0,.227.23H5.65A.35.35,0,0,0,6,16.65a.34252.34252,0,0,0-.1035-.245l-1.492-1.4945,3.242-3.242a.5.5,0,0,0,0-.707Z" />
    <path class="icon-path" d="M16.7705,1H12.35a.35.35,0,0,0-.35.35V1.3525a.34253.34253,0,0,0,.1035.245l1.492,1.492-3.242,3.242a.5.5,0,0,0,0,.707l.608.608a.5.5,0,0,0,.707,0l3.242-3.242,1.492,1.4925A.344.344,0,0,0,16.65,6,.35.35,0,0,0,17,5.65h0V1.2295A.25.25,0,0,0,16.7705,1Z" />
      </svg>`;
  }, []);

  return <span className="Icon close" ref={root} />;
};

export default React.memo(Icon, neverRerender);
