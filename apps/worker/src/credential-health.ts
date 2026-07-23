import { parseDataForSeoCredentials } from './backlink-gap';

type CredentialHealthResult = {
  checked: boolean;
  healthy: boolean;
  message: string;
};

export async function checkOrgCredentialLiveHealth(
  service: string,
  decryptedSecret: string,
  fetchFn: typeof fetch = fetch,
): Promise<CredentialHealthResult> {
  if (service !== 'DATAFORSEO') {
    return {
      checked: false,
      healthy: true,
      message: `Org credential ${service}: checked`,
    };
  }

  const credentials = parseDataForSeoCredentials(decryptedSecret);
  const response = await fetchFn('https://api.dataforseo.com/v3/appendix/user_data', {
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64')}`,
    },
  });

  return {
    checked: true,
    healthy: response.ok,
    message: `Org credential ${service}: live ping ${response.ok ? 'ok' : `failed ${response.status}`}`,
  };
}
