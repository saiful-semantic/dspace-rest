import axios, {AxiosError, AxiosResponse} from 'axios'
import qs from 'node:querystring'
import {
  Communities, SubCommunities, Collection, Collections,
  Item, Items, Bundle, Bundles, Bitstream, Bitstreams
} from './dspace.types'

// Based on this GIST example:
// https://gist.github.com/JaysonChiang/fa704307bacffe0f17d51acf6b1292fc

axios.interceptors.request.use((config) => {
  config.withCredentials = true
  return config
})

axios.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const {data, status} = error.response!
    switch (status) {
      case 400:
        console.error(data)
        break

      case 401:
        console.error('unauthorised')
        break

      case 404:
        console.error('/not-found')
        break

      case 500:
        console.error('/server-error')
        break
    }
    return Promise.reject(error)
  }
)

let baseUrl: string
const responseBody = <T>(response: AxiosResponse<T>) => response.data

const request = {
  get: <T>(url: string) => axios.get<T>(url).then(responseBody),
  post: <T>(url: string, body: {}) => axios.post<T>(url, body).then(responseBody),
  patch: <T>(url: string, body: {}) => axios.patch<T>(url, body).then(responseBody),
  postForm: <T>(url: string, body: {}) =>
    axios.post<T>(url, body, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(responseBody),
  put: <T>(url: string, body: {}) => axios.put<T>(url, body).then(responseBody),
  putUri: <T>(url: string, uri: string) =>
    axios.put<T>(url, uri, {
      headers: {
        'Content-Type': 'text/uri-list'
      }
    }).then(responseBody),
  delete: <T>(url: string) => axios.delete<T>(url).then(responseBody)
}

const auth = {
  login: async (user: string, password: string) => {
    try {
      const loginRes = await axios.get('/api/authn/status')
      const csrf = loginRes.headers['dspace-xsrf-token']
      const res = await axios.post('/api/authn/login',
        qs.stringify({user, password}), {
          headers: {
            'x-xsrf-token': csrf,
            Cookie: `DSPACE-XSRF-COOKIE=${csrf}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      axios.defaults.headers.Authorization = res.headers.authorization
      axios.defaults.headers.Cookie = `DSPACE-XSRF-COOKIE=${csrf}`
      axios.defaults.headers['x-xsrf-token'] = csrf
      console.log(`Log-in success with user: ${user}`)
      return 'login success'
    } catch (e: any) {
      console.log(`Login failed: ${e.errorCode}`)
      return 'login failure'
    }
  }
}

const communities = {
  all: (size = 20) => request.get<Communities>(`/api/core/communities?size=${size}`),
  byId: (comId: string) => request.get<Communities>(`/api/core/communities/${comId}`),
  top: (size = 20) => request.get<Communities>(`/api/core/communities/search/top?size=${size}`),
  subById: (comId: string, size = 100) => request
    .get<SubCommunities>(`/api/core/communities/${comId}/subcommunities?size=${size}`)
}

const collections = {
  all: (size = 20) => request
    .get<Collections>(`/api/core/collections?size=${size}`),
  byComId: (comId: string, size = 100) => request
    .get<Collections>(`/api/core/communities/${comId}/collections?size=${size}`),
  create: (comId: string, payload: {}) => request
    .post<Collection>(`/api/core/collections?parent=${comId}`, payload),
  deleteById: (colId: string) => request.delete<void>(`/api/core/collections/${colId}`)
}

const items = {
  all: (size = 20) => request.get<Items>(`/api/core/items?${size}`),
  byId: (itemId: string) => request.get<Item>(`/api/core/items/${itemId}`),
  update: (itemId: string, payload: {}) => request.patch<Item>(`/api/core/items/${itemId}`, payload),
  move: (itemId: string, targetColId: string) => request
    .putUri<void>(`/api/core/items/${itemId}/owningCollection`,
      `${baseUrl}/api/core/collections/${targetColId}`)
}

const bundles = {
  byId: (bundleId: string) => request.get<Bundle>(`/api/core/bundles/${bundleId}`),
  byItemId: (itemId: string) => request.get<Bundles>(`/api/core/items/${itemId}/bundles`),
}

const bitstreams = {
  byBundleId: (bundleId: string) => request.get<Bitstreams>(`/api/core/bundles/${bundleId}/bitstreams`),
  create: (bundleId: string, payload: {}) => request
    .postForm<Bitstream>(`/api/core/bundles/${bundleId}/bitstreams`, payload),
  delete: (bitstreamId: string) => request.delete<void>(`/api/core/bitstreams/${bitstreamId}`),
  multiDelete: (payload: any) => request.patch('/api/core/bitstreams', payload),
}

const dspaceApi = {
  init: (url: string, agent: string) => {
    axios.defaults.headers['User-Agent'] = agent
    baseUrl = axios.defaults.baseURL = url
  },
  auth,
  communities,
  collections,
  items,
  bundles,
  bitstreams
}

export default dspaceApi
