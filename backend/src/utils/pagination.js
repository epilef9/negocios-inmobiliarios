const paginate = (data, page, limit) => {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const totalItems = data.length;

    const paginatedData = data.slice(startIndex, endIndex);
    const totalPages = Math.ceil(totalItems / limit);

    return {
        totalItems,
        totalPages,
        currentPage: page,
        data: paginatedData,
    };
};

module.exports = paginate;