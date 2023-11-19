function parseCodeIdList(rawLog: string): number[] {
  const regex = /"code_id","value":"([\d\\\"]+)"/g;

  return (rawLog.match(regex) || []).map(
    (x) => +x.split("\\")[1].replace('"', "")
  );
}

function parseAddressList(rawLog: string): string[] {
  const regex = /"contract_address","value":"([\w\\\"]+)"/g;

  return (rawLog.match(regex) || []).map((x) =>
    x.split("\\")[1].replace('"', "")
  );
}

export { parseCodeIdList, parseAddressList };
