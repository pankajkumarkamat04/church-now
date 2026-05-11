/**
 * Extract page/limit from query params and return pagination helpers.
 * @param {object} query - req.query
 * @param {number} [defaultLimit=20]
 * @returns {{ page: number, limit: number, skip: number }}
 */
function getPaginationParams(query, defaultLimit = 20) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Wrap a data array + total count into a standard paginated response shape.
 * @param {Array} data
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 * @returns {{ data: Array, total: number, page: number, limit: number, totalPages: number }}
 */
function paginatedResponse(data, total, page, limit) {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

module.exports = { getPaginationParams, paginatedResponse };
