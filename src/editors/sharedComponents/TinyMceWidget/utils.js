const getLocatorSafeName = ({ displayName }) => {
  let decodedName = displayName;
  try {
    // Studio renders encoded URLs; store the filename, so it is not encoded twice.
    decodedName = decodeURIComponent(displayName);
  } catch (error) {
    // A literal percent sign in an asset name need not be URI encoded.
  }
  // Asset keys can contain Unicode letters (for example Ñ); preserve them on save.
  const locatorSafeName = decodedName.replace(/[^\p{L}\p{N}_.%-]/gu, '');
  return locatorSafeName;
};

export const getStaticUrl = ({ displayName }) => (`/static/${getLocatorSafeName({ displayName })}`);

export const getRelativeUrl = ({ courseId, displayName }) => {
  if (displayName) {
    const assetCourseId = courseId.replace('course', 'asset');
    const assetPathShell = `/${assetCourseId}+type@asset+block@`;
    return `${assetPathShell}${displayName}`;
  }
  return '';
};

export const parseAssetName = (relativeUrl) => {
  let assetName = '';
  if (relativeUrl.match(/\/asset-v1:\S+[+]\S+[@]\S+[+]\S+\/\w/)?.length >= 1) {
    const assetBlockName = relativeUrl.substring(0, relativeUrl.search(/("|&quot;)/));
    const dividedSrc = assetBlockName.split(/\/asset-v1:\S+[+]\S+[@]\S+[+]\S+\//);
    [, assetName] = dividedSrc;
  } else {
    const assetBlockName = relativeUrl.substring(relativeUrl.indexOf('@') + 1, relativeUrl.search(/("|&quot;)/));
    assetName = assetBlockName.substring(assetBlockName.indexOf('@') + 1);
  }
  return assetName;
};
