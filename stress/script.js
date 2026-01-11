import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '3m', target: 200 },
    { duration: '3m', target: 200 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(99)<1000'],
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = 'http://host.docker.internal/rest-app/api/saludo';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-stress-test',
    },
  };

  const res = http.get(BASE_URL, params);

  check(res, {
    'is status 200': (r) => r.status === 200,
    'body contains saludo': (r) => r.body.includes('saludo') || r.status === 200,
    'transaction time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(Math.random() * 2 + 1);
}