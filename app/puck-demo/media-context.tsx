"use client";

import { createContext, useContext } from "react";

/** Tenant media URLs made available to the Puck image picker. Empty (default) → the
 *  picker falls back to its preset luxury photos (used on the context-less /puck-demo). */
export const MediaContext = createContext<string[]>([]);
export const useMedia = () => useContext(MediaContext);
