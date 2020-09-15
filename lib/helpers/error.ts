export const errSilent = e => null;

export const errLog = e => {
  console.log(e);
  return null;
}

export const errReq = e => {
  console.log(e.response.req);
  return null;
}

export const errKeys = e => {
  console.log(Object.keys(e));
  return null;
}

export const errSig = e => {
  console.log('!! ...CAUGHT AN ERROR ... !!');
  return null;
}
