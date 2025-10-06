import { relations } from "drizzle-orm";
import { areas, areaVersions, areaLayers, areaLayerPostalCodes } from "./schema";

export const areasRelations = relations(areas, ({ many }) => ({
  versions: many(areaVersions),
  layers: many(areaLayers),
}));

export const areaVersionsRelations = relations(areaVersions, ({ one }) => ({
  area: one(areas, {
    fields: [areaVersions.areaId],
    references: [areas.id],
  }),
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
