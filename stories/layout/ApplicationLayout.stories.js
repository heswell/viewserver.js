import React, { useState } from "react";

import { Flexbox, Stack, Tabstrip, Tab } from "@heswell/layout";
import { ThemeProvider, theme } from "@heswell/toolkit-1.0";
import { AppHeader } from "@heswell/toolkit-2.0";

import "../story.css";
import "../theme.css";

export default {
  title: "Layout/ApplicationLayout",
  component: AppHeader,
};

export const DefaultAppHeader = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const handleChange = (e, tabIndex) => {
    setTabIndex(tabIndex);
  };
  return (
    <ThemeProvider theme={theme}>
      <Flexbox column style={{ height: "100vh" }}>
        <AppHeader appTitle="Toolkit" style={{ height: 60 }}>
          <Tabstrip value={tabIndex} onChange={handleChange}>
            <Tab label="Page 1" />
            <Tab label="Page 2" />
            <Tab label="Page 3" />
          </Tabstrip>
        </AppHeader>
        <Stack active={tabIndex} style={{ flex: 1 }}>
          <div
            title="Page 1"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span>Page 1</span>
          </div>
          <div
            title="Page 2"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span>Page 2</span>
          </div>
          <div
            title="Page 3"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span>Page 3</span>
          </div>
        </Stack>
      </Flexbox>
    </ThemeProvider>
  );
};
