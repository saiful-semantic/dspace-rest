export interface ApiInfo {
  dspaceUI: string,
  dspaceName: string,
  dspaceServer: string,
  dspaceVersion : string,
  type: string
}

export interface DspaceEntity {
  id: string
  uuid: string
  name: string
  handle: string
  metadata: {
    [propName: string]: [{
      value: string | number | Date,
      language: string,
      authority: string,
      confidence: number,
      place: number
    }]
  }
  _links: {
    [propName: string]: {
      href: string
    }
  }
}

export interface Collection extends DspaceEntity {
  type: 'collection'
  archivedItemsCount: number
}

export interface Community extends DspaceEntity {
  type: 'community'
  archivedItemsCount: number
}

export interface Item extends DspaceEntity {
  type: 'item'
  inArchive: boolean,
  discoverable: boolean,
  withdrawn: boolean,
  lastModified: Date,
}

export interface Bitstream extends DspaceEntity {
  type: 'bitstream'
  sequenceId: number
  sizeBytes: number
  checkSum: {
    checkSumAlgorithm: string
    value: string
  }
}

export interface Bundle extends DspaceEntity {
  type: 'bundle'
  _embedded: {
    bitstreams: Bitstream[]
  }
}

export interface ListResponse {
  _links: {
    [propName: string]: {
      href: string
    }
  }
  page: {
    size?: number
    totalElements?: number
    totalPages?: number
    number?: number
  }
}

export interface Communities extends ListResponse {
  _embedded: {
    communities: Community[]
  }
}

export interface SubCommunities extends ListResponse {
  _embedded: {
    subcommunities: Community[]
  }
}

export interface Collections extends ListResponse {
  _embedded: {
    collections: Collection[]
  }
}

export interface Items extends ListResponse {
  _embedded: {
    items: Item[]
  }
}

export interface Bundles extends ListResponse {
  _embedded: {
    bundles: Bundle[]
  }
}

export interface Bitstreams extends ListResponse {
  _embedded: {
    bitstreams: Bitstream[]
  }
}
