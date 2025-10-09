import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { EasyDataLoader } from "./loader" // Adjust the import path as needed

describe("EasyDataLoader", () => {
  interface Data {
    id: number
    value: string
  }
  let batchLoadFn: Mock<(keys: number[]) => Promise<(Data | Error)[]>>
  let dataLoader: EasyDataLoader<number, Data>

  beforeEach(() => {
    batchLoadFn = vi.fn(async (keys: number[]): Promise<(Error | Data)[]> => {
      return keys.map((key) => ({ id: key, value: `value-${key}` }))
    })

    dataLoader = new EasyDataLoader(batchLoadFn)
  })

  it("should load data for a single key", async () => {
    const data = await dataLoader.load(1)
    expect(data).toEqual({ id: 1, value: "value-1" })
    expect(batchLoadFn).toHaveBeenCalledWith([1])
  })

  it("should batch load data for multiple keys", async () => {
    const [data1, data2] = await Promise.all([
      dataLoader.load(1),
      dataLoader.load(2),
    ])
    expect(data1).toEqual({ id: 1, value: "value-1" })
    expect(data2).toEqual({ id: 2, value: "value-2" })
    expect(batchLoadFn).toHaveBeenCalledWith([1, 2])

    await new Promise((resolve) => setTimeout(resolve, 0))

    const [data3, data4] = await Promise.all([
      dataLoader.load(3),
      dataLoader.load(4),
    ])
    expect(data3).toEqual({ id: 3, value: "value-3" })
    expect(data4).toEqual({ id: 4, value: "value-4" })
    expect(batchLoadFn).toHaveBeenCalledWith([3, 4])
  })

  it("should cache loaded data", async () => {
    await dataLoader.load(1)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await dataLoader.load(1)
    expect(batchLoadFn).toHaveBeenCalledTimes(1)
  })

  it("should handle errors in batch loading", async () => {
    batchLoadFn.mockRejectedValueOnce(new Error("Batch load failed"))

    await expect(dataLoader.load(1)).rejects.toThrow("Batch load failed")
  })

  it("should resolve all promises even if some keys fail", async () => {
    batchLoadFn.mockImplementationOnce(async (keys: number[]) => {
      return keys.map((key) => {
        if (key === 1) return new Error("Failed to load key 1")
        return { id: key, value: `value-${key}` }
      })
    })

    const load1 = dataLoader.load(1)
    const load2 = dataLoader.load(2)

    await expect(load1).rejects.toThrow("Failed to load key 1")
    await expect(load2).resolves.toEqual({ id: 2, value: "value-2" })
  })

  it("should clear cache", async () => {
    const p1 = dataLoader.load(1)
    const p2 = dataLoader.load(2)
    await Promise.all([p1, p2])
    expect(batchLoadFn).toHaveBeenCalledTimes(1)

    dataLoader.clear()

    await EasyDataLoader.nextTick()
    await dataLoader.load(1)
    await EasyDataLoader.nextTick()
    await dataLoader.load(2)
    expect(batchLoadFn).toHaveBeenCalledTimes(3)
  })
})
