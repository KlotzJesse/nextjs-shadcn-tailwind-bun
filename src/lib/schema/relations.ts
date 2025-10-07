import { relations } from "drizzle-orm";
import {
  areas,
  areaVersions,
  areaLayers,
  areaLayerPostalCodes,
  areaChanges,
  areaUndoStacks
} from "./schema";

export const areasRelations = relations(areas, ({ many, one }) => ({
  versions: many(areaVersions),
  layers: many(areaLayers),
  changes: many(areaChanges),
  undoStack: one(areaUndoStacks, {
    fields: [areas.id],
    references: [areaUndoStacks.areaId],
  }),
  currentVersion: one(areaVersions, {
    fields: [areas.currentVersionId],
    references: [areaVersions.id],
  }),
}));

export const areaVersionsRelations = relations(areaVersions, ({ one, many }) => ({
  area: one(areas, {
    fields: [areaVersions.areaId],
    references: [areas.id],
  }),
  parentVersion: one(areaVersions, {
    fields: [areaVersions.parentVersionId],
    references: [areaVersions.id],
  }),
  childVersions: many(areaVersions),
  changes: many(areaChanges),
}));

export const areaLayersRelations = relations(areaLayers, ({ one, many }) => ({
  area: one(areas, {
    fields: [areaLayers.areaId],
    references: [areas.id],
  }),
  postalCodes: many(areaLayerPostalCodes),
}));

export const areaLayerPostalCodesRelations = relations(
  areaLayerPostalCodes,
  ({ one }) => ({
    layer: one(areaLayers, {
      fields: [areaLayerPostalCodes.layerId],
      references: [areaLayers.id],
    }),
  })
);

export const areaChangesRelations = relations(areaChanges, ({ one }) => ({
  area: one(areas, {
    fields: [areaChanges.areaId],
    references: [areas.id],
  }),
  version: one(areaVersions, {
    fields: [areaChanges.versionId],
    references: [areaVersions.id],
  }),
}));

export const areaUndoStacksRelations = relations(areaUndoStacks, ({ one }) => ({
  area: one(areas, {
    fields: [areaUndoStacks.areaId],
    references: [areas.id],
  }),
}));
