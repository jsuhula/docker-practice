import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    load_test: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      gracefulStop: '5s',
      tags: { test_type: 'stress_test' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = 'http://host.docker.internal:8080/api/saludo'; 

export default function () {

  const res = http.get(BASE_URL)

  check(res, {
    'Success': (r) => r.status === 200,
  });

  sleep(0.5);
}
