export default async function handler(req, res) {
  try {
    const response = await fetch(
      'http://api.irishrail.ie/realtime/realtime.asmx/getStationDataByCodeXML?StationCode=CHORC'
    );
    const xml = await response.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=59');
    res.status(200).send(xml);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch train data' });
  }
}
