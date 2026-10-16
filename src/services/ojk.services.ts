import { OjkLegalListModel } from "../models/ojk.model";
import Fuse from "fuse.js";

export type OjkMatchedEntity = {
  platform_name: string;
  license_number?: string;
  company_name?: string;
  website_url?: string;
};

export type OjkLookupResult = {
  is_ojk_legal: boolean;
  matched_entities: OjkMatchedEntity[];
};

let cachedPlatforms: any[] = [];
let fuseInstance: Fuse<any> | null = null;
let lastFetchTime = 0;
let isFetching = false;
const CACHE_TTL = 60 * 60 * 1000;

async function getOjkDataAndFuse() {
  const now = Date.now();

  if (!fuseInstance || now - lastFetchTime > CACHE_TTL) {
    //kalau sedang fetch, tunggu dan pakai cache lama
    if (isFetching) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (fuseInstance) return { allPlatforms: cachedPlatforms, fuse: fuseInstance };
    }

    isFetching = true;
    cachedPlatforms = await OjkLegalListModel.find({}).lean();

    fuseInstance = new Fuse(cachedPlatforms, {
      keys: ["platform_name", "company_name", "aliases"],
      threshold: 0.3,
      includeScore: true,
      ignoreLocation: true,
    });

    lastFetchTime = now;
    isFetching = false;
  }

  return { allPlatforms: cachedPlatforms, fuse: fuseInstance };
}

export const checkOjkLegality = async (
  query: string,
): Promise<OjkLookupResult> => {
  const userQuery = query.toLowerCase().trim();

  //Guard clause: kosong atau terlalu pendek
  if (!userQuery || userQuery.length < 4) {
    return {
      is_ojk_legal: false,
      matched_entities: [],
    };
  }

  const { allPlatforms, fuse } = await getOjkDataAndFuse();

  //Mencegah false positive seperti "Ada" match ke "AdaKami"
  const fuseResults =
    userQuery.length >= 5
      ? fuse
          .search(userQuery)
          .filter((res) => res.score !== undefined && res.score < 0.2)
          .map((res) => res.item)
      : [];

  //Manual filter untuk kalimat panjang yang mengandung nama platform
  const manualMatches = allPlatforms.filter((p) => {
    const platformName = p.platform_name.toLowerCase().trim();

    //Platform harus minimal 4 karakter agar tidak false positive
    const isPlatformInQuery =
      platformName.length >= 4 && userQuery.includes(platformName);

    const isAliasInQuery =
      Array.isArray(p.aliases) &&
      p.aliases.some((alias: string) => {
        const cleanAlias = alias.toLowerCase().trim();
        return cleanAlias.length >= 4 && userQuery.includes(cleanAlias);
      });

    return isPlatformInQuery || isAliasInQuery;
  });
console.log("Query length:", userQuery.length);
console.log("Fuse dijalankan:", userQuery.length >= 5);
console.log("Fuse results:", fuseResults.map(r => r.platform_name));
console.log("Manual matches:", manualMatches.map(r => r.platform_name));

  const combinedMatches = [...manualMatches, ...fuseResults];

  //Deduplikasi berdasarkan platform_name
  const uniqueMatchesMap = new Map();
  combinedMatches.forEach((item) => {
    uniqueMatchesMap.set(item.platform_name, item);
  });
console.log("Fuse results: ", fuseResults.map(r => r.platform_name));
console.log("Manual matches:", manualMatches.map(r => r.platform_name));

  const finalMatches = Array.from(uniqueMatchesMap.values());

  return {
    is_ojk_legal: finalMatches.length > 0,
    matched_entities: finalMatches.map((m: any) => ({
      platform_name: m.platform_name,
      license_number: m.license_number,
      company_name: m.company_name,
      website_url: m.website_url,
    })),
  };
};

